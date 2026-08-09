"""Build one of the game's realistic MPFB cast members.

Run with Blender, not the system Python:

    /Applications/Blender.app/Contents/MacOS/Blender \
      --background --python tools/characters/build_mpfb_character.py

Prerequisites are Blender 4.2+, MPFB 2.x, the CC0 MakeHuman System Assets pack,
and any attributed official community packs named by a preset. The script
follows MPFB's public service API and deliberately exports a plain,
four-influence GLB that the game's small loader can consume.
"""

from __future__ import annotations

import argparse
import copy
import importlib
import json
import sys
import tempfile
from array import array
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "assets" / "rigs" / "XiaoChen.glb"


# Presets keep identity, anatomy, wardrobe, and texture-export policy together.
# Most filenames below are from the official CC0 MakeHuman System Assets pack;
# the few official CC-BY community pieces are called out in the character brief.
# Adding a cast member should therefore be data work rather than another copy of
# the build pipeline. `gender` follows MakeHuman's female=0, male=1 convention.
PRESETS: dict[str, dict[str, object]] = {
    "xiaochen": {
        "display_name": "小陈 (Xiao Chen)",
        "description": "young, slim male commuter",
        "object_name": "XiaoChen",
        "output_name": "XiaoChen.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.96,
            "age": 0.53,
            "weight": 0.47,
            "muscle": 0.44,
            "height": 0.57,
            "proportions": 0.53,
        },
        "details": (
            # The broad MakeHuman ethnicity macro is only a starting point.  These restrained
            # symmetric controls establish an East Asian eyelid, cheek and nose profile while
            # leaving enough variation for this to remain Xiao Chen rather than a cast template.
            ("eyes/l-eye-epicanthus-in.target.gz", 0.22),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.22),
            ("eyes/l-eye-eyefold-down.target.gz", 0.16),
            ("eyes/r-eye-eyefold-down.target.gz", 0.16),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/l-eye-height2-decr.target.gz", 0.08),
            ("eyes/r-eye-height2-decr.target.gz", 0.08),
            ("eyes/l-eye-corner1-up.target.gz", 0.04),
            ("eyes/r-eye-corner1-up.target.gz", 0.04),
            ("nose/nose-scale-depth-decr.target.gz", 0.10),
            ("nose/nose-width1-incr.target.gz", 0.10),
            ("nose/nose-width2-incr.target.gz", 0.06),
            ("nose/nose-nostrils-width-incr.target.gz", 0.06),
            ("cheek/l-cheek-bones-incr.target.gz", 0.10),
            ("cheek/r-cheek-bones-incr.target.gz", 0.10),
            ("head/head-scale-horiz-incr.target.gz", 0.035),
            ("chin/chin-width-incr.target.gz", 0.04),
            ("asym/asym-cheek-1-l.target.gz", 0.045),
            ("asym/asym-eye-3-r.target.gz", 0.025),
            ("asym/asym-mouth-2-l.target.gz", 0.020),
        ),
        "skin": "young_asian_male.mhmat",
        # Keep the photographed Asian skin neutral. Earlier channel-heavy grading made the skin
        # orange and tried to carry ethnicity with colour instead of anatomy.
        "texture_grades": {"skin": (0.98, 0.96, 0.94)},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow009.mhclo", "Eyebrows", "brows", 512, "PNG", True),
            ("hair", "short04.mhclo", "Hair", "hair", 1024, "PNG", True),
            ("clothes", "male_casualsuit05.mhclo", "Clothes", "commuter_clothes", 2048, "JPEG", False),
            ("clothes", "shoes04.mhclo", "Clothes", "shoes", 1024, "JPEG", False),
        ),
    },
    "wang_ayi": {
        "display_name": "王阿姨 (Wang Ayi)",
        "description": "older, short and rounded female neighbour",
        "object_name": "WangAyi",
        "output_name": "WangAyi.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.04,
            "age": 0.84,
            "weight": 0.62,
            "muscle": 0.34,
            "height": 0.43,
            "proportions": 0.47,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.18),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.18),
            ("eyes/l-eye-eyefold-down.target.gz", 0.10),
            ("eyes/r-eye-eyefold-down.target.gz", 0.10),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.12),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.12),
            ("eyes/l-eye-height2-decr.target.gz", 0.05),
            ("eyes/r-eye-height2-decr.target.gz", 0.05),
            ("nose/nose-scale-depth-decr.target.gz", 0.08),
            ("nose/nose-width1-incr.target.gz", 0.12),
            ("nose/nose-width2-incr.target.gz", 0.08),
            ("nose/nose-nostrils-width-incr.target.gz", 0.08),
            ("cheek/l-cheek-bones-incr.target.gz", 0.12),
            ("cheek/r-cheek-bones-incr.target.gz", 0.12),
            ("cheek/l-cheek-inner-incr.target.gz", 0.06),
            ("cheek/r-cheek-inner-incr.target.gz", 0.06),
            ("head/head-scale-horiz-incr.target.gz", 0.055),
            ("head/head-round.target.gz", 0.06),
            ("chin/chin-width-incr.target.gz", 0.065),
            ("asym/asym-cheek-1-l.target.gz", 0.030),
            ("asym/asym-eye-3-r.target.gz", 0.018),
            ("asym/asym-mouth-2-r.target.gz", 0.018),
        ),
        "skin": "old_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.98, 0.96, 0.94),
            "plum_knit": (0.66, 0.45, 0.52),
            "charcoal_trousers": (0.34, 0.37, 0.42),
        },
        "grey_hair": ("grey_short",),
        # This community knit was authored close to the body. A small normal offset makes it a
        # loose older-neighbour sweater and prevents the fuller generated torso poking through.
        "mesh_offsets": {"plum_knit": 0.008},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow004.mhclo", "Eyebrows", "brows", 512, "PNG", True),
            # Both eyes stay visible. A cropped salt-and-pepper style and loose knit separates an
            # older hutong neighbour from the fashion bob and tight striped skirt it replaces.
            ("hair", "short01.mhclo", "Hair", "grey_short", 1024, "PNG", True),
            ("clothes", "toigo_fisherman_sweater.mhclo", "Clothes", "plum_knit", 2048, "JPEG", False),
            ("clothes", "toigo_wool_pants.mhclo", "Clothes", "charcoal_trousers", 1024, "JPEG", False),
            ("clothes", "shoes02.mhclo", "Clothes", "walking_shoes", 1024, "JPEG", False),
        ),
    },
    "doudou": {
        "display_name": "豆豆 (Doudou)",
        "description": "primary-school-age child with child proportions",
        "object_name": "Doudou",
        "output_name": "Doudou.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.72,
            "age": 0.14,
            "weight": 0.46,
            "muscle": 0.28,
            "height": 0.47,
            "proportions": 0.52,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.20),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.20),
            ("eyes/l-eye-eyefold-down.target.gz", 0.14),
            ("eyes/r-eye-eyefold-down.target.gz", 0.14),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.10),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.10),
            ("eyes/l-eye-height2-decr.target.gz", 0.03),
            ("eyes/r-eye-height2-decr.target.gz", 0.03),
            ("eyes/l-eye-corner1-up.target.gz", 0.02),
            ("eyes/r-eye-corner1-up.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.06),
            ("nose/nose-width1-incr.target.gz", 0.08),
            ("nose/nose-width2-incr.target.gz", 0.04),
            ("nose/nose-nostrils-width-incr.target.gz", 0.04),
            ("cheek/l-cheek-bones-incr.target.gz", 0.05),
            ("cheek/r-cheek-bones-incr.target.gz", 0.05),
            ("cheek/l-cheek-inner-incr.target.gz", 0.12),
            ("cheek/r-cheek-inner-incr.target.gz", 0.12),
            ("head/head-scale-horiz-incr.target.gz", 0.12),
            ("head/head-scale-vert-incr.target.gz", 0.13),
            ("head/head-scale-depth-incr.target.gz", 0.11),
            ("head/head-round.target.gz", 0.14),
            ("chin/chin-width-incr.target.gz", 0.015),
            ("chin/chin-height-decr.target.gz", 0.12),
            ("nose/nose-scale-vert-decr.target.gz", 0.12),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.04),
            ("legs/upperlegs-height-decr.target.gz", 0.16),
            ("legs/lowerlegs-height-decr.target.gz", 0.16),
            ("torso/measure-shoulder-dist-decr.target.gz", 0.12),
            ("asym/asym-cheek-1-l.target.gz", 0.016),
            ("asym/asym-eye-3-r.target.gz", 0.012),
            ("asym/asym-mouth-2-l.target.gz", 0.012),
        ),
        "skin": "young_asian_male.mhmat",
        "texture_grades": {
            "skin": (0.99, 0.97, 0.95),
            "child_hair": (0.48, 0.43, 0.39),
            "child_brows": (0.58, 0.55, 0.52),
            # The community shirt is neutral white, so this bakes Doudou's mustard identity while
            # retaining the cloth value variation. The separate denim shorts keep their navy.
            "child_shirt": (0.78, 0.50, 0.16),
            "child_shorts": (0.78, 0.84, 0.94),
        },
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow012.mhclo", "Eyebrows", "child_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "child_hair", 1024, "PNG", True),
            ("clothes", "elvs_crude_t-shirt_male.mhclo", "Clothes", "child_shirt", 1024, "PNG", True),
            ("clothes", "cortu_jeans_shorts.mhclo", "Clothes", "child_shorts", 1024, "PNG", True),
            ("clothes", "shoes06.mhclo", "Clothes", "trainers", 1024, "JPEG", False),
        ),
    },
    "li_shifu": {
        "display_name": "李师傅 (Li Shifu)",
        "description": "broad, weathered middle-aged bicycle mechanic",
        "object_name": "LiShifu",
        "output_name": "LiShifu.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.97,
            "age": 0.74,
            "weight": 0.61,
            "muscle": 0.58,
            "height": 0.54,
            "proportions": 0.51,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.15),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.15),
            ("eyes/l-eye-eyefold-down.target.gz", 0.07),
            ("eyes/r-eye-eyefold-down.target.gz", 0.07),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.08),
            ("eyes/r-eye-height2-decr.target.gz", 0.08),
            ("nose/nose-scale-depth-decr.target.gz", 0.05),
            ("nose/nose-width1-incr.target.gz", 0.10),
            ("nose/nose-width2-incr.target.gz", 0.08),
            ("nose/nose-nostrils-width-incr.target.gz", 0.07),
            ("cheek/l-cheek-bones-incr.target.gz", 0.10),
            ("cheek/r-cheek-bones-incr.target.gz", 0.10),
            ("cheek/l-cheek-inner-incr.target.gz", 0.03),
            ("cheek/r-cheek-inner-incr.target.gz", 0.03),
            ("head/head-square.target.gz", 0.08),
            ("head/head-scale-horiz-incr.target.gz", 0.05),
            ("chin/chin-width-incr.target.gz", 0.09),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.03),
            ("asym/asym-cheek-1-l.target.gz", 0.040),
            ("asym/asym-eye-3-r.target.gz", 0.020),
            ("asym/asym-mouth-2-l.target.gz", 0.015),
        ),
        "skin": "middleage_asian_male.mhmat",
        "texture_grades": {
            "skin": (0.92, 0.88, 0.84),
            "mechanic_overalls": (0.60, 0.68, 0.78),
        },
        # He is greying, not silver-haired. The amount is identity data so older characters do
        # not all receive the same salt-and-pepper treatment.
        "grey_hair": {"greying_hair": 0.30},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow003.mhclo", "Eyebrows", "mechanic_brows", 512, "PNG", True),
            ("hair", "short02.mhclo", "Hair", "greying_hair", 1024, "PNG", True),
            ("clothes", "male_worksuit01.mhclo", "Clothes", "mechanic_overalls", 2048, "JPEG", False),
            ("clothes", "shoes03.mhclo", "Clothes", "work_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaoyu": {
        "display_name": "小雨 (Xiaoyu)",
        "description": "young, slight and quick-moving dumpling-shop server",
        "object_name": "Xiaoyu",
        "output_name": "Xiaoyu.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.02,
            "age": 0.40,
            "weight": 0.41,
            "muscle": 0.34,
            "height": 0.64,
            "proportions": 0.49,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.21),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.21),
            ("eyes/l-eye-eyefold-down.target.gz", 0.11),
            ("eyes/r-eye-eyefold-down.target.gz", 0.11),
            ("eyes/l-eye-eyefold-concave.target.gz", 0.05),
            ("eyes/r-eye-eyefold-concave.target.gz", 0.05),
            ("eyes/l-eye-scale-incr.target.gz", 0.03),
            ("eyes/r-eye-scale-incr.target.gz", 0.03),
            ("eyes/l-eye-corner1-up.target.gz", 0.03),
            ("eyes/r-eye-corner1-up.target.gz", 0.03),
            ("nose/nose-scale-depth-decr.target.gz", 0.10),
            ("nose/nose-width1-incr.target.gz", 0.05),
            ("nose/nose-width2-incr.target.gz", 0.03),
            ("nose/nose-nostrils-width-incr.target.gz", 0.03),
            ("cheek/l-cheek-bones-incr.target.gz", 0.07),
            ("cheek/r-cheek-bones-incr.target.gz", 0.07),
            ("cheek/l-cheek-inner-incr.target.gz", 0.05),
            ("cheek/r-cheek-inner-incr.target.gz", 0.05),
            ("head/head-invertedtriangular.target.gz", 0.06),
            ("head/head-scale-horiz-incr.target.gz", 0.02),
            ("chin/chin-width-decr.target.gz", 0.05),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.03),
            ("mouth/mouth-upperlip-volume-incr.target.gz", 0.03),
            ("asym/asym-cheek-1-l.target.gz", 0.020),
            ("asym/asym-eye-3-r.target.gz", 0.015),
            ("asym/asym-mouth-2-l.target.gz", 0.012),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (1.00, 0.98, 0.96),
            "server_ponytail": (0.48, 0.42, 0.38),
            "server_polo": (0.72, 0.31, 0.28),
            "server_trousers": (0.56, 0.58, 0.62),
        },
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow010.mhclo", "Eyebrows", "server_brows", 512, "PNG", True),
            ("hair", "ponytail01.mhclo", "Hair", "server_ponytail", 1024, "PNG", True),
            ("clothes", "namuhekam_male_polo_shirt.mhclo", "Clothes", "server_polo", 1024, "PNG", True),
            ("clothes", "toigo_wool_pants.mhclo", "Clothes", "server_trousers", 1024, "JPEG", False),
            ("clothes", "shoes04.mhclo", "Clothes", "server_shoes", 1024, "JPEG", False),
        ),
    },
    "xiao_xu": {
        "display_name": "小许 (Xiao Xu)",
        "description": "average-build young female airport ground worker",
        "object_name": "XiaoXu",
        "output_name": "XiaoXu.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.03,
            "age": 0.53,
            "weight": 0.49,
            "muscle": 0.39,
            "height": 0.44,
            "proportions": 0.50,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.17),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.17),
            ("eyes/l-eye-eyefold-down.target.gz", 0.08),
            ("eyes/r-eye-eyefold-down.target.gz", 0.08),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.10),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.10),
            ("eyes/l-eye-height2-decr.target.gz", 0.05),
            ("eyes/r-eye-height2-decr.target.gz", 0.05),
            ("eyes/l-eye-corner1-up.target.gz", 0.02),
            ("eyes/r-eye-corner1-up.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.07),
            ("nose/nose-width1-incr.target.gz", 0.07),
            ("nose/nose-width2-incr.target.gz", 0.05),
            ("nose/nose-nostrils-width-incr.target.gz", 0.04),
            ("cheek/l-cheek-bones-incr.target.gz", 0.09),
            ("cheek/r-cheek-bones-incr.target.gz", 0.09),
            ("cheek/l-cheek-inner-incr.target.gz", 0.03),
            ("cheek/r-cheek-inner-incr.target.gz", 0.03),
            ("head/head-oval.target.gz", 0.06),
            ("head/head-scale-horiz-incr.target.gz", 0.03),
            ("chin/chin-width-decr.target.gz", 0.02),
            ("chin/chin-height-incr.target.gz", 0.03),
            ("mouth/mouth-cupidsbow-incr.target.gz", 0.02),
            ("mouth/mouth-upperlip-volume-incr.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.018),
            ("asym/asym-eye-3-r.target.gz", 0.022),
            ("asym/asym-mouth-2-r.target.gz", 0.012),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.99, 0.97, 0.95),
            "ground_ponytail": (0.48, 0.43, 0.40),
            "ground_uniform": (0.64, 0.82, 1.00),
            "uniform_shoes": (0.26, 0.26, 0.29),
        },
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow007.mhclo", "Eyebrows", "ground_brows", 512, "PNG", True),
            ("hair", "ponytail01.mhclo", "Hair", "ground_ponytail", 1024, "PNG", True),
            ("clothes", "toigo_female_double-breasted_suit.mhclo", "Clothes", "ground_uniform", 2048, "JPEG", False),
            ("clothes", "shoes01.mhclo", "Clothes", "uniform_shoes", 1024, "JPEG", False),
        ),
    },
    "wang_manager": {
        "display_name": "王经理 (Wang Manager)",
        "description": "solid middle-aged male office manager",
        "object_name": "WangManager",
        "output_name": "WangManager.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.97,
            "age": 0.71,
            "weight": 0.55,
            "muscle": 0.45,
            "height": 0.52,
            "proportions": 0.51,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/l-eye-eyefold-down.target.gz", 0.06),
            ("eyes/r-eye-eyefold-down.target.gz", 0.06),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.03),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.03),
            ("eyes/l-eye-height2-decr.target.gz", 0.09),
            ("eyes/r-eye-height2-decr.target.gz", 0.09),
            ("eyes/l-eye-bag-incr.target.gz", 0.04),
            ("eyes/r-eye-bag-incr.target.gz", 0.04),
            ("nose/nose-scale-depth-decr.target.gz", 0.03),
            ("nose/nose-width1-incr.target.gz", 0.09),
            ("nose/nose-width2-incr.target.gz", 0.07),
            ("nose/nose-nostrils-width-incr.target.gz", 0.06),
            ("cheek/l-cheek-bones-incr.target.gz", 0.08),
            ("cheek/r-cheek-bones-incr.target.gz", 0.08),
            ("cheek/l-cheek-volume-incr.target.gz", 0.04),
            ("cheek/r-cheek-volume-incr.target.gz", 0.04),
            ("head/head-rectangular.target.gz", 0.07),
            ("head/head-scale-horiz-incr.target.gz", 0.06),
            ("chin/chin-width-incr.target.gz", 0.08),
            ("chin/chin-prominent-incr.target.gz", 0.03),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.04),
            ("mouth/mouth-angles-down.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.030),
            ("asym/asym-eye-3-r.target.gz", 0.018),
            ("asym/asym-mouth-2-r.target.gz", 0.020),
        ),
        "skin": "middleage_asian_male.mhmat",
        "texture_grades": {"skin": (0.97, 0.95, 0.92)},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow005.mhclo", "Eyebrows", "manager_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "manager_hair", 1024, "PNG", True),
            ("clothes", "spamrakuen_tbm_glasses_frames_01.mhclo", "Clothes", "manager_glasses", 512, "PNG", True),
            ("clothes", "toigo_male_suit_3.mhclo", "Clothes", "manager_suit", 2048, "JPEG", False),
            ("clothes", "shoes04.mhclo", "Clothes", "manager_shoes", 1024, "JPEG", False),
        ),
    },
    "lu_apo": {
        "display_name": "陆阿婆 (Lu Apo)",
        "description": "very elderly, short and wiry Shanghai grandmother",
        "object_name": "LuApo",
        "output_name": "LuApo.glb",
        "values": {
            "african": 0.0,
            "asian": 1.0,
            "caucasian": 0.0,
            "gender": 0.05,
            "age": 0.96,
            "weight": 0.37,
            "muscle": 0.20,
            "height": 0.45,
            "proportions": 0.44,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/l-eye-eyefold-down.target.gz", 0.07),
            ("eyes/r-eye-eyefold-down.target.gz", 0.07),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/l-eye-height2-decr.target.gz", 0.07),
            ("eyes/r-eye-height2-decr.target.gz", 0.07),
            ("eyes/l-eye-bag-incr.target.gz", 0.07),
            ("eyes/r-eye-bag-incr.target.gz", 0.07),
            ("eyes/l-eye-corner1-down.target.gz", 0.02),
            ("eyes/r-eye-corner1-down.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.05),
            ("nose/nose-width1-incr.target.gz", 0.08),
            ("nose/nose-width2-incr.target.gz", 0.06),
            ("nose/nose-nostrils-width-incr.target.gz", 0.05),
            ("nose/nose-scale-vert-incr.target.gz", 0.04),
            ("cheek/l-cheek-bones-incr.target.gz", 0.09),
            ("cheek/r-cheek-bones-incr.target.gz", 0.09),
            ("cheek/l-cheek-volume-decr.target.gz", 0.08),
            ("cheek/r-cheek-volume-decr.target.gz", 0.08),
            ("head/head-oval.target.gz", 0.07),
            ("head/head-scale-horiz-decr.target.gz", 0.02),
            ("chin/chin-width-decr.target.gz", 0.04),
            ("chin/chin-height-decr.target.gz", 0.04),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.03),
            ("mouth/mouth-laugh-lines-out.target.gz", 0.06),
            ("mouth/mouth-angles-down.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.050),
            ("asym/asym-eye-3-r.target.gz", 0.030),
            ("asym/asym-mouth-2-l.target.gz", 0.025),
        ),
        "skin": "old_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.97, 0.95, 0.92),
            "apo_blouse": (0.78, 0.76, 0.83),
            "apo_gilet": (0.55, 0.52, 0.62),
            "apo_trousers": (0.46, 0.49, 0.55),
        },
        "texture_saturation": {"apo_gilet": 0.48, "apo_trousers": 0.52},
        "grey_hair": {"silver_hair": 0.96},
        # The patterned camisole reads as her quilted gilet when layered over a short-sleeve blouse.
        # A tiny offset keeps the two community meshes from fighting at the shoulders and waist.
        "mesh_offsets": {"apo_gilet": 0.006},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow001.mhclo", "Eyebrows", "apo_brows", 512, "PNG", True),
            ("hair", "short04.mhclo", "Hair", "silver_hair", 1024, "PNG", True),
            ("clothes", "toigo_basic_tucked_t-shirt.mhclo", "Clothes", "apo_blouse", 1024, "PNG", True),
            ("clothes", "toigo_camisole_top.mhclo", "Clothes", "apo_gilet", 1024, "PNG", True),
            ("clothes", "toigo_harem_pants.mhclo", "Clothes", "apo_trousers", 1024, "PNG", True),
            ("clothes", "shoes02.mhclo", "Clothes", "apo_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaolin_cashier": {
        "display_name": "小林 (Xiaolin, cashier)",
        "description": "young, reserved neighbourhood supermarket cashier",
        "object_name": "XiaolinCashier",
        "output_name": "XiaolinCashier.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.03, "age": 0.43, "weight": 0.43,
            "muscle": 0.33, "height": 0.58, "proportions": 0.48,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.19),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.19),
            ("eyes/l-eye-eyefold-down.target.gz", 0.09),
            ("eyes/r-eye-eyefold-down.target.gz", 0.09),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/l-eye-height2-decr.target.gz", 0.04),
            ("eyes/r-eye-height2-decr.target.gz", 0.04),
            ("eyes/l-eye-scale-incr.target.gz", 0.02),
            ("eyes/r-eye-scale-incr.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.09),
            ("nose/nose-width1-incr.target.gz", 0.06),
            ("nose/nose-width2-incr.target.gz", 0.04),
            ("nose/nose-nostrils-width-incr.target.gz", 0.03),
            ("cheek/l-cheek-bones-incr.target.gz", 0.06),
            ("cheek/r-cheek-bones-incr.target.gz", 0.06),
            ("cheek/l-cheek-inner-incr.target.gz", 0.07),
            ("cheek/r-cheek-inner-incr.target.gz", 0.07),
            ("head/head-round.target.gz", 0.05),
            ("head/head-scale-horiz-incr.target.gz", 0.04),
            ("chin/chin-width-decr.target.gz", 0.03),
            ("chin/chin-height-decr.target.gz", 0.02),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.04),
            ("mouth/mouth-cupidsbow-incr.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.018),
            ("asym/asym-eye-3-r.target.gz", 0.014),
            ("asym/asym-mouth-2-r.target.gz", 0.010),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.99, 0.97, 0.94),
            "cashier_hair": (0.50, 0.44, 0.40),
            "cashier_trousers": (0.55, 0.57, 0.62),
        },
        # A quiet blue uniform reads clearly as retail without the lace-and-print
        # camisole that failed the first in-game silhouette review.
        "texture_flat_colors": {"cashier_polo": (0.0497, 0.1590, 0.2623)},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow011.mhclo", "Eyebrows", "cashier_brows", 512, "PNG", True),
            ("hair", "ponytail01.mhclo", "Hair", "cashier_hair", 1024, "PNG", True),
            ("clothes", "namuhekam_male_polo_shirt.mhclo", "Clothes", "cashier_polo", 1024, "JPEG", False),
            ("clothes", "toigo_wool_pants.mhclo", "Clothes", "cashier_trousers", 1024, "JPEG", False),
            ("clothes", "shoes04.mhclo", "Clothes", "cashier_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaozhao_coworker": {
        "display_name": "小赵 (Xiaozhao, coworker)",
        "description": "friendly young female office coworker",
        "object_name": "XiaozhaoCoworker",
        "output_name": "XiaozhaoCoworker.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.03, "age": 0.51, "weight": 0.46,
            "muscle": 0.36, "height": 0.50, "proportions": 0.50,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.16),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.16),
            ("eyes/l-eye-eyefold-down.target.gz", 0.07),
            ("eyes/r-eye-eyefold-down.target.gz", 0.07),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.12),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.12),
            ("eyes/l-eye-height2-decr.target.gz", 0.05),
            ("eyes/r-eye-height2-decr.target.gz", 0.05),
            ("eyes/l-eye-corner1-up.target.gz", 0.02),
            ("eyes/r-eye-corner1-up.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.06),
            ("nose/nose-width1-incr.target.gz", 0.07),
            ("nose/nose-width2-incr.target.gz", 0.05),
            ("nose/nose-nostrils-width-incr.target.gz", 0.04),
            ("cheek/l-cheek-bones-incr.target.gz", 0.09),
            ("cheek/r-cheek-bones-incr.target.gz", 0.09),
            ("cheek/l-cheek-inner-incr.target.gz", 0.03),
            ("cheek/r-cheek-inner-incr.target.gz", 0.03),
            ("head/head-oval.target.gz", 0.05),
            ("head/head-scale-vert-incr.target.gz", 0.04),
            ("head/head-scale-horiz-decr.target.gz", 0.02),
            ("chin/chin-width-incr.target.gz", 0.02),
            ("chin/chin-height-incr.target.gz", 0.03),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.02),
            ("mouth/mouth-upperlip-volume-incr.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.022),
            ("asym/asym-eye-3-r.target.gz", 0.018),
            ("asym/asym-mouth-2-l.target.gz", 0.014),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.99, 0.97, 0.95),
            "coworker_hair": (0.48, 0.43, 0.40),
            "coworker_trousers": (0.58, 0.60, 0.64),
            "coworker_shoes": (0.40, 0.39, 0.38),
        },
        "texture_flat_colors": {"coworker_top": (0.1070, 0.2122, 0.2623)},
        "mesh_offsets": {"coworker_top": 0.006},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow008.mhclo", "Eyebrows", "coworker_brows", 512, "PNG", True),
            ("hair", "short03.mhclo", "Hair", "coworker_hair", 1024, "PNG", True),
            ("clothes", "joepal_crude_t-shirt_female.mhclo", "Clothes", "coworker_top", 1024, "JPEG", False),
            ("clothes", "toigo_wool_pants.mhclo", "Clothes", "coworker_trousers", 1024, "JPEG", False),
            ("clothes", "shoes01.mhclo", "Clothes", "coworker_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaozhou_student": {
        "display_name": "小周 (Xiaozhou, student)",
        "description": "lean, eager young female university student",
        "object_name": "XiaozhouStudent",
        "output_name": "XiaozhouStudent.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.02, "age": 0.40, "weight": 0.40,
            "muscle": 0.37, "height": 0.60, "proportions": 0.52,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.20),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.20),
            ("eyes/l-eye-eyefold-down.target.gz", 0.12),
            ("eyes/r-eye-eyefold-down.target.gz", 0.12),
            ("eyes/l-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/r-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.03),
            ("eyes/r-eye-height2-decr.target.gz", 0.03),
            ("eyes/l-eye-scale-incr.target.gz", 0.03),
            ("eyes/r-eye-scale-incr.target.gz", 0.03),
            ("nose/nose-scale-depth-decr.target.gz", 0.08),
            ("nose/nose-width1-incr.target.gz", 0.05),
            ("nose/nose-width2-incr.target.gz", 0.03),
            ("nose/nose-nostrils-width-incr.target.gz", 0.03),
            ("cheek/l-cheek-bones-incr.target.gz", 0.11),
            ("cheek/r-cheek-bones-incr.target.gz", 0.11),
            ("cheek/l-cheek-volume-decr.target.gz", 0.03),
            ("cheek/r-cheek-volume-decr.target.gz", 0.03),
            ("head/head-diamond.target.gz", 0.05),
            ("head/head-scale-vert-incr.target.gz", 0.03),
            ("head/head-scale-horiz-decr.target.gz", 0.02),
            ("chin/chin-width-decr.target.gz", 0.03),
            ("chin/chin-height-incr.target.gz", 0.03),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.016),
            ("asym/asym-eye-3-r.target.gz", 0.020),
            ("asym/asym-mouth-2-r.target.gz", 0.012),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.99, 0.97, 0.95),
            "student_braid": (0.52, 0.46, 0.42),
            "student_tee": (0.85, 0.88, 0.92),
            "student_cargos": (0.66, 0.68, 0.72),
        },
        "texture_flat_colors": {
            "student_hoodie": (0.0685, 0.1590, 0.3325),
        },
        "mesh_offsets": {"student_hoodie": 0.007},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow006.mhclo", "Eyebrows", "student_brows", 512, "PNG", True),
            ("hair", "braid01.mhclo", "Hair", "student_braid", 1024, "PNG", True),
            ("clothes", "toigo_basic_tucked_t-shirt.mhclo", "Clothes", "student_tee", 1024, "PNG", True),
            ("clothes", "elvs_hooded_sweat_jacket1.mhclo", "Clothes", "student_hoodie", 2048, "JPEG", False),
            ("clothes", "cortu_cargo_pants.mhclo", "Clothes", "student_cargos", 1024, "PNG", True),
            ("clothes", "shoes05.mhclo", "Clothes", "student_trainers", 1024, "JPEG", False),
        ),
    },
    "li_dama": {
        "display_name": "李大妈 (Li Dama)",
        "description": "active, broad older park-dance leader",
        "object_name": "LiDama",
        "output_name": "LiDama.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.04, "age": 0.81, "weight": 0.60,
            "muscle": 0.42, "height": 0.48, "proportions": 0.47,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.16),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.16),
            ("eyes/l-eye-eyefold-down.target.gz", 0.08),
            ("eyes/r-eye-eyefold-down.target.gz", 0.08),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.06),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.06),
            ("eyes/l-eye-height2-decr.target.gz", 0.07),
            ("eyes/r-eye-height2-decr.target.gz", 0.07),
            ("eyes/l-eye-bag-incr.target.gz", 0.05),
            ("eyes/r-eye-bag-incr.target.gz", 0.05),
            ("eyes/l-eye-corner1-up.target.gz", 0.02),
            ("eyes/r-eye-corner1-up.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.06),
            ("nose/nose-width1-incr.target.gz", 0.11),
            ("nose/nose-width2-incr.target.gz", 0.08),
            ("nose/nose-nostrils-width-incr.target.gz", 0.07),
            ("cheek/l-cheek-bones-incr.target.gz", 0.13),
            ("cheek/r-cheek-bones-incr.target.gz", 0.13),
            ("cheek/l-cheek-volume-incr.target.gz", 0.04),
            ("cheek/r-cheek-volume-incr.target.gz", 0.04),
            ("head/head-square.target.gz", 0.06),
            ("head/head-scale-horiz-incr.target.gz", 0.06),
            ("chin/chin-width-incr.target.gz", 0.08),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.05),
            ("mouth/mouth-laugh-lines-out.target.gz", 0.05),
            ("mouth/mouth-angles-up.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.035),
            ("asym/asym-eye-3-r.target.gz", 0.022),
            ("asym/asym-mouth-2-l.target.gz", 0.022),
        ),
        "skin": "old_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.98, 0.96, 0.93),
            "dancer_trousers": (0.50, 0.52, 0.57),
        },
        "texture_flat_colors": {
            "dancer_top": (0.3500, 0.1100, 0.1300),
        },
        "grey_hair": {"dancer_grey_hair": 0.74},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow004.mhclo", "Eyebrows", "dancer_brows", 512, "PNG", True),
            ("hair", "short02.mhclo", "Hair", "dancer_grey_hair", 1024, "PNG", True),
            ("clothes", "janexx_old_female_sweater.mhclo", "Clothes", "dancer_top", 2048, "JPEG", False),
            ("clothes", "toigo_wool_pants.mhclo", "Clothes", "dancer_trousers", 1024, "JPEG", False),
            ("clothes", "shoes05.mhclo", "Clothes", "dancer_trainers", 1024, "JPEG", False),
        ),
    },
    "chen_zookeeper": {
        "display_name": "陈师傅 (Chen Shifu, zookeeper)",
        "description": "sturdy middle-aged female outdoor animal keeper",
        "object_name": "ChenZookeeper",
        "output_name": "ChenZookeeper.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.05, "age": 0.64, "weight": 0.54,
            "muscle": 0.49, "height": 0.52, "proportions": 0.50,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/l-eye-eyefold-down.target.gz", 0.06),
            ("eyes/r-eye-eyefold-down.target.gz", 0.06),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.05),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.05),
            ("eyes/l-eye-height2-decr.target.gz", 0.06),
            ("eyes/r-eye-height2-decr.target.gz", 0.06),
            ("nose/nose-scale-depth-decr.target.gz", 0.04),
            ("nose/nose-width1-incr.target.gz", 0.10),
            ("nose/nose-width2-incr.target.gz", 0.07),
            ("nose/nose-nostrils-width-incr.target.gz", 0.07),
            ("cheek/l-cheek-bones-incr.target.gz", 0.13),
            ("cheek/r-cheek-bones-incr.target.gz", 0.13),
            ("cheek/l-cheek-inner-incr.target.gz", 0.02),
            ("cheek/r-cheek-inner-incr.target.gz", 0.02),
            ("head/head-rectangular.target.gz", 0.05),
            ("head/head-scale-horiz-incr.target.gz", 0.04),
            ("chin/chin-width-incr.target.gz", 0.07),
            ("chin/chin-prominent-incr.target.gz", 0.02),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.04),
            ("asym/asym-cheek-1-l.target.gz", 0.040),
            ("asym/asym-eye-3-r.target.gz", 0.024),
            ("asym/asym-mouth-2-r.target.gz", 0.018),
        ),
        "skin": "middleage_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.93, 0.88, 0.82),
            "keeper_hair": (0.50, 0.45, 0.41),
            "keeper_uniform": (0.56, 0.72, 0.48),
            "keeper_shoes": (0.50, 0.45, 0.40),
        },
        # The source cap is CC0; replacing its entire albedo also removes the
        # source slogan and leaves a plain, role-appropriate field cap.
        "texture_flat_colors": {"keeper_cap": (0.0497, 0.1022, 0.0423)},
        "mesh_offsets": {"keeper_cap": 0.008},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow002.mhclo", "Eyebrows", "keeper_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "keeper_hair", 1024, "PNG", True),
            ("clothes", "male_casualsuit01.mhclo", "Clothes", "keeper_uniform", 2048, "JPEG", False),
            ("clothes", "toigo_maga_hat.mhclo", "Clothes", "keeper_cap", 1024, "JPEG", False),
            ("clothes", "shoes03.mhclo", "Clothes", "keeper_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaozhou_courier": {
        "display_name": "小周 (Xiaozhou, delivery rider)",
        "description": "lean young male food-delivery courier",
        "object_name": "XiaozhouCourier",
        "output_name": "XiaozhouCourier.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.97, "age": 0.46, "weight": 0.43,
            "muscle": 0.49, "height": 0.55, "proportions": 0.54,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.17),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.17),
            ("eyes/l-eye-eyefold-down.target.gz", 0.09),
            ("eyes/r-eye-eyefold-down.target.gz", 0.09),
            ("eyes/l-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/r-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.07),
            ("eyes/r-eye-height2-decr.target.gz", 0.07),
            ("eyes/l-eye-corner1-up.target.gz", 0.02),
            ("eyes/r-eye-corner1-up.target.gz", 0.02),
            ("nose/nose-scale-depth-decr.target.gz", 0.04),
            ("nose/nose-width1-incr.target.gz", 0.09),
            ("nose/nose-width2-incr.target.gz", 0.06),
            ("nose/nose-nostrils-width-incr.target.gz", 0.06),
            ("cheek/l-cheek-bones-incr.target.gz", 0.12),
            ("cheek/r-cheek-bones-incr.target.gz", 0.12),
            ("cheek/l-cheek-volume-decr.target.gz", 0.06),
            ("cheek/r-cheek-volume-decr.target.gz", 0.06),
            ("head/head-oval.target.gz", 0.06),
            ("head/head-scale-horiz-decr.target.gz", 0.03),
            ("chin/chin-width-incr.target.gz", 0.04),
            ("chin/chin-height-incr.target.gz", 0.03),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.03),
            ("asym/asym-cheek-1-l.target.gz", 0.042),
            ("asym/asym-eye-3-r.target.gz", 0.025),
            ("asym/asym-mouth-2-l.target.gz", 0.018),
        ),
        "skin": "young_asian_male.mhmat",
        "texture_grades": {
            "skin": (0.92, 0.87, 0.80),
            "courier_hair": (0.48, 0.43, 0.40),
            "courier_tee": (0.78, 0.82, 0.78),
            "courier_cargos": (0.46, 0.48, 0.53),
        },
        "texture_flat_colors": {
            "courier_hoodie": (0.0497, 0.2747, 0.1329),
            "courier_cap": (0.0252, 0.1946, 0.0931),
        },
        "mesh_offsets": {"courier_hoodie": 0.008, "courier_cap": 0.008},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow009.mhclo", "Eyebrows", "courier_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "courier_hair", 1024, "PNG", True),
            ("clothes", "elvs_crude_t-shirt_male.mhclo", "Clothes", "courier_tee", 1024, "PNG", True),
            ("clothes", "elvs_hooded_sweat_jacket1.mhclo", "Clothes", "courier_hoodie", 2048, "JPEG", False),
            ("clothes", "cortu_cargo_pants.mhclo", "Clothes", "courier_cargos", 1024, "PNG", True),
            ("clothes", "toigo_maga_hat.mhclo", "Clothes", "courier_cap", 1024, "JPEG", False),
            ("clothes", "shoes04.mhclo", "Clothes", "courier_shoes", 1024, "JPEG", False),
        ),
    },
    "supermarket_owner": {
        "display_name": "超市老板 (supermarket owner)",
        "description": "short, broad middle-aged neighbourhood shop owner",
        "object_name": "SupermarketOwner",
        "output_name": "SupermarketOwner.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.98, "age": 0.70, "weight": 0.68,
            "muscle": 0.42, "height": 0.44, "proportions": 0.48,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/l-eye-eyefold-down.target.gz", 0.06),
            ("eyes/r-eye-eyefold-down.target.gz", 0.06),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.08),
            ("eyes/r-eye-height2-decr.target.gz", 0.08),
            ("eyes/l-eye-bag-incr.target.gz", 0.035),
            ("eyes/r-eye-bag-incr.target.gz", 0.035),
            ("nose/nose-scale-depth-decr.target.gz", 0.03),
            ("nose/nose-width1-incr.target.gz", 0.12),
            ("nose/nose-width2-incr.target.gz", 0.09),
            ("nose/nose-nostrils-width-incr.target.gz", 0.08),
            ("cheek/l-cheek-bones-incr.target.gz", 0.08),
            ("cheek/r-cheek-bones-incr.target.gz", 0.08),
            ("cheek/l-cheek-volume-incr.target.gz", 0.07),
            ("cheek/r-cheek-volume-incr.target.gz", 0.07),
            ("head/head-square.target.gz", 0.07),
            ("head/head-scale-horiz-incr.target.gz", 0.07),
            ("chin/chin-width-incr.target.gz", 0.10),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.04),
            ("mouth/mouth-angles-down.target.gz", 0.02),
            ("asym/asym-cheek-1-l.target.gz", 0.036),
            ("asym/asym-eye-3-r.target.gz", 0.021),
            ("asym/asym-mouth-2-r.target.gz", 0.018),
        ),
        "skin": "middleage_asian_male.mhmat",
        "texture_grades": {
            "skin": (0.96, 0.92, 0.87),
            "owner_hair": (0.52, 0.47, 0.43),
            "owner_trousers": (0.52, 0.55, 0.61),
            "owner_shoes": (0.48, 0.46, 0.43),
        },
        "texture_flat_colors": {
            # A clean teal shop shirt remains readable behind the counter without forcing a
            # second torso mesh to fit this deliberately broad body.
            "owner_polo": (0.075, 0.240, 0.285),
        },
        "grey_hair": {"owner_hair": 0.18},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow001.mhclo", "Eyebrows", "owner_brows", 512, "PNG", True),
            ("hair", "short04.mhclo", "Hair", "owner_hair", 1024, "PNG", True),
            ("clothes", "spamrakuen_tbm_glasses_frames_01.mhclo", "Clothes", "owner_glasses", 512, "PNG", True),
            ("clothes", "toigo_basic_tucked_t-shirt.mhclo", "Clothes", "owner_polo", 1024, "JPEG", False),
            ("clothes", "elvs_male_trouser.mhclo", "Clothes", "owner_trousers", 1024, "JPEG", False),
            ("clothes", "shoes03.mhclo", "Clothes", "owner_shoes", 1024, "JPEG", False),
        ),
    },
    "xiaomei_flight_attendant": {
        "display_name": "小美 (Xiaomei, flight attendant)",
        "description": "young, slight lead cabin attendant in a wine uniform",
        "object_name": "XiaomeiFlightAttendant",
        "output_name": "XiaomeiFlightAttendant.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.02, "age": 0.51, "weight": 0.43,
            "muscle": 0.34, "height": 0.52, "proportions": 0.50,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.22),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.22),
            ("eyes/l-eye-eyefold-down.target.gz", 0.12),
            ("eyes/r-eye-eyefold-down.target.gz", 0.12),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.08),
            ("eyes/l-eye-height2-decr.target.gz", 0.03),
            ("eyes/r-eye-height2-decr.target.gz", 0.03),
            ("eyes/l-eye-scale-incr.target.gz", 0.025),
            ("eyes/r-eye-scale-incr.target.gz", 0.025),
            ("eyes/l-eye-corner1-up.target.gz", 0.025),
            ("eyes/r-eye-corner1-up.target.gz", 0.025),
            ("nose/nose-scale-depth-decr.target.gz", 0.10),
            ("nose/nose-width1-incr.target.gz", 0.05),
            ("nose/nose-width2-incr.target.gz", 0.03),
            ("nose/nose-nostrils-width-incr.target.gz", 0.03),
            ("cheek/l-cheek-bones-incr.target.gz", 0.08),
            ("cheek/r-cheek-bones-incr.target.gz", 0.08),
            ("cheek/l-cheek-inner-incr.target.gz", 0.06),
            ("cheek/r-cheek-inner-incr.target.gz", 0.06),
            ("head/head-invertedtriangular.target.gz", 0.05),
            ("head/head-scale-horiz-decr.target.gz", 0.02),
            ("chin/chin-width-decr.target.gz", 0.04),
            ("chin/chin-height-decr.target.gz", 0.02),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.025),
            ("mouth/mouth-cupidsbow-incr.target.gz", 0.025),
            ("mouth/mouth-angles-up.target.gz", 0.015),
            ("asym/asym-cheek-1-l.target.gz", 0.016),
            ("asym/asym-eye-3-r.target.gz", 0.017),
            ("asym/asym-mouth-2-l.target.gz", 0.011),
        ),
        "skin": "young_asian_female.mhmat",
        "texture_grades": {
            "skin": (1.00, 0.98, 0.96),
            "cabin_hair": (0.48, 0.42, 0.39),
            # Preserve the suit's shirt/lapel value separation while shifting the charcoal
            # source toward the cabin crew's restrained wine-red uniform.
            "cabin_uniform": (0.72, 0.34, 0.40),
            "cabin_shoes": (0.30, 0.28, 0.28),
        },
        "texture_saturation": {"cabin_uniform": 0.82},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow010.mhclo", "Eyebrows", "cabin_brows", 512, "PNG", True),
            ("hair", "ponytail01.mhclo", "Hair", "cabin_hair", 1024, "PNG", True),
            ("clothes", "toigo_female_suit.mhclo", "Clothes", "cabin_uniform", 2048, "JPEG", False),
            ("clothes", "shoes01.mhclo", "Clothes", "cabin_shoes", 1024, "JPEG", False),
        ),
    },
    "wang_rail_clerk": {
        "display_name": "王师傅 (Wang Shifu, railway clerk)",
        "description": "short, mature and broad female railway ticket clerk",
        "object_name": "WangRailClerk",
        "output_name": "WangRailClerk.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.03, "age": 0.79, "weight": 0.60,
            "muscle": 0.36, "height": 0.42, "proportions": 0.47,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.15),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.15),
            ("eyes/l-eye-eyefold-down.target.gz", 0.07),
            ("eyes/r-eye-eyefold-down.target.gz", 0.07),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.07),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.07),
            ("eyes/l-eye-height2-decr.target.gz", 0.07),
            ("eyes/r-eye-height2-decr.target.gz", 0.07),
            ("eyes/l-eye-bag-incr.target.gz", 0.055),
            ("eyes/r-eye-bag-incr.target.gz", 0.055),
            ("nose/nose-scale-depth-decr.target.gz", 0.06),
            ("nose/nose-width1-incr.target.gz", 0.10),
            ("nose/nose-width2-incr.target.gz", 0.08),
            ("nose/nose-nostrils-width-incr.target.gz", 0.065),
            ("cheek/l-cheek-bones-incr.target.gz", 0.11),
            ("cheek/r-cheek-bones-incr.target.gz", 0.11),
            ("cheek/l-cheek-volume-incr.target.gz", 0.05),
            ("cheek/r-cheek-volume-incr.target.gz", 0.05),
            ("head/head-round.target.gz", 0.055),
            ("head/head-scale-horiz-incr.target.gz", 0.055),
            ("chin/chin-width-incr.target.gz", 0.075),
            ("chin/chin-height-decr.target.gz", 0.025),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.03),
            ("mouth/mouth-laugh-lines-out.target.gz", 0.05),
            ("mouth/mouth-angles-down.target.gz", 0.015),
            ("asym/asym-cheek-1-l.target.gz", 0.034),
            ("asym/asym-eye-3-r.target.gz", 0.024),
            ("asym/asym-mouth-2-l.target.gz", 0.020),
        ),
        "skin": "old_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.98, 0.96, 0.93),
            "rail_hair": (0.56, 0.52, 0.48),
            "rail_uniform": (0.30, 0.48, 0.76),
            "rail_shoes": (0.40, 0.39, 0.38),
        },
        "texture_saturation": {"rail_uniform": 0.68},
        "grey_hair": {"rail_hair": 0.40},
        "mesh_offsets": {"rail_uniform": 0.006},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow004.mhclo", "Eyebrows", "rail_brows", 512, "PNG", True),
            # A neat short crop keeps both eyes and the open glasses readable at the ticket desk.
            ("hair", "short02.mhclo", "Hair", "rail_hair", 1024, "PNG", True),
            # Open CC0 frames keep both eyes readable; the earlier lens-bearing proxy turned
            # almost opaque under game lighting and looked like sunglasses at the ticket desk.
            ("clothes", "spamrakuen_tbm_glasses_frames_01.mhclo", "Clothes", "rail_glasses", 512, "PNG", True),
            ("clothes", "toigo_female_double-breasted_suit.mhclo", "Clothes", "rail_uniform", 2048, "JPEG", False),
            ("clothes", "shoes02.mhclo", "Clothes", "rail_shoes", 1024, "JPEG", False),
        ),
    },
    "lao_ma_grill": {
        "display_name": "老马 (Lao Ma, grill vendor)",
        "description": "heavy, smoke-weathered male night-market grill vendor",
        "object_name": "LaoMaGrill",
        "output_name": "LaoMaGrill.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.97, "age": 0.72, "weight": 0.67,
            "muscle": 0.46, "height": 0.52, "proportions": 0.49,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.14),
            ("eyes/l-eye-eyefold-down.target.gz", 0.07),
            ("eyes/r-eye-eyefold-down.target.gz", 0.07),
            ("eyes/l-eye-height2-decr.target.gz", 0.09),
            ("eyes/r-eye-height2-decr.target.gz", 0.09),
            ("eyes/l-eye-bag-incr.target.gz", 0.04),
            ("eyes/r-eye-bag-incr.target.gz", 0.04),
            ("nose/nose-scale-depth-decr.target.gz", 0.05),
            ("nose/nose-width1-incr.target.gz", 0.11),
            ("nose/nose-width2-incr.target.gz", 0.08),
            ("nose/nose-nostrils-width-incr.target.gz", 0.08),
            ("cheek/l-cheek-bones-incr.target.gz", 0.10),
            ("cheek/r-cheek-bones-incr.target.gz", 0.10),
            ("cheek/l-cheek-volume-incr.target.gz", 0.06),
            ("cheek/r-cheek-volume-incr.target.gz", 0.06),
            ("head/head-round.target.gz", 0.06),
            ("head/head-scale-horiz-incr.target.gz", 0.065),
            ("chin/chin-width-incr.target.gz", 0.10),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.05),
            ("mouth/mouth-laugh-lines-out.target.gz", 0.035),
            ("asym/asym-cheek-1-l.target.gz", 0.042),
            ("asym/asym-eye-3-r.target.gz", 0.022),
            ("asym/asym-mouth-2-r.target.gz", 0.018),
        ),
        "skin": "middleage_asian_male.mhmat",
        "texture_grades": {
            "skin": (0.91, 0.85, 0.78),
            "grill_trousers": (0.48, 0.50, 0.54),
            "grill_shoes": (0.42, 0.40, 0.37),
        },
        "texture_flat_colors": {
            # Deep brick workwear gives Lao Ma the night-market colour block while keeping
            # the cloth fitted cleanly to his heavy torso.
            "grill_polo": (0.240, 0.036, 0.025),
            "grill_cap": (0.040, 0.046, 0.058),
        },
        "grey_hair": {"grill_hair": 0.26},
        "mesh_offsets": {"grill_cap": 0.008},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow003.mhclo", "Eyebrows", "grill_brows", 512, "PNG", True),
            ("hair", "short02.mhclo", "Hair", "grill_hair", 1024, "PNG", True),
            ("clothes", "toigo_basic_tucked_t-shirt.mhclo", "Clothes", "grill_polo", 1024, "JPEG", False),
            ("clothes", "elvs_male_trouser.mhclo", "Clothes", "grill_trousers", 1024, "JPEG", False),
            # Use the explicitly CC0 cap geometry. Its source graphic is replaced pixel-for-pixel,
            # leaving a plain charcoal work cap and avoiding the newsboy asset's legacy AGPL tag.
            ("clothes", "toigo_maga_hat.mhclo", "Clothes", "grill_cap", 1024, "JPEG", False),
            ("clothes", "shoes03.mhclo", "Clothes", "grill_shoes", 1024, "JPEG", False),
        ),
    },
    "liu_security_officer": {
        "display_name": "刘警官 (Liu, security officer)",
        "description": "square, sturdy adult female airport security officer",
        "object_name": "LiuSecurityOfficer",
        "output_name": "LiuSecurityOfficer.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.05, "age": 0.59, "weight": 0.54,
            "muscle": 0.50, "height": 0.47, "proportions": 0.53,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/l-eye-eyefold-down.target.gz", 0.06),
            ("eyes/r-eye-eyefold-down.target.gz", 0.06),
            ("eyes/l-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/r-eye-eyefold-convex.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.07),
            ("eyes/r-eye-height2-decr.target.gz", 0.07),
            ("nose/nose-scale-depth-decr.target.gz", 0.03),
            ("nose/nose-width1-incr.target.gz", 0.10),
            ("nose/nose-width2-incr.target.gz", 0.07),
            ("nose/nose-nostrils-width-incr.target.gz", 0.06),
            ("cheek/l-cheek-bones-incr.target.gz", 0.12),
            ("cheek/r-cheek-bones-incr.target.gz", 0.12),
            ("cheek/l-cheek-inner-incr.target.gz", 0.025),
            ("cheek/r-cheek-inner-incr.target.gz", 0.025),
            ("head/head-rectangular.target.gz", 0.05),
            ("head/head-scale-horiz-incr.target.gz", 0.04),
            ("chin/chin-width-incr.target.gz", 0.07),
            ("chin/chin-prominent-incr.target.gz", 0.02),
            ("mouth/mouth-scale-horiz-incr.target.gz", 0.025),
            ("mouth/mouth-angles-down.target.gz", 0.012),
            ("asym/asym-cheek-1-l.target.gz", 0.032),
            ("asym/asym-eye-3-r.target.gz", 0.018),
            ("asym/asym-mouth-2-r.target.gz", 0.015),
        ),
        "skin": "middleage_asian_female.mhmat",
        "texture_grades": {
            "skin": (0.96, 0.92, 0.88),
            "security_hair": (0.46, 0.42, 0.39),
            # Preserve the authored webbing, pouches and wear while shifting the source olive
            # toward the restrained navy used by the game's airport-security uniform.
            "security_vest": (0.18, 0.28, 0.58),
            "security_trousers": (0.42, 0.44, 0.48),
            "security_shoes": (0.40, 0.39, 0.39),
        },
        "texture_saturation": {"security_vest": 0.72},
        # Replacing every source cap pixel, rather than tinting it, guarantees the airport
        # uniform carries no inherited slogan or branding.
        "texture_flat_colors": {
            "security_polo": (0.347, 0.456, 0.597),
            "security_cap": (0.025, 0.048, 0.082),
        },
        # The Equipment 03 vest was authored for a female base and needs only a tiny clearance
        # adjustment over the polo. Its material is named tactical_vest rather than after the
        # mhclo filename, so expose that alias to the export texture optimizer.
        "mesh_offsets": {"security_vest": 0.008, "security_cap": 0.008},
        "material_matches": {"security_vest": ("tactical_vest",)},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow002.mhclo", "Eyebrows", "security_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "security_hair", 1024, "PNG", True),
            ("clothes", "toigo_basic_tucked_t-shirt.mhclo", "Clothes", "security_polo", 1024, "JPEG", False),
            ("clothes", "mindfront_tactical_vest_female.mhclo", "Clothes", "security_vest", 1024, "JPEG", False),
            ("clothes", "cortu_cargo_pants.mhclo", "Clothes", "security_trousers", 1024, "PNG", True),
            ("clothes", "toigo_maga_hat.mhclo", "Clothes", "security_cap", 1024, "JPEG", False),
            ("clothes", "shoes03.mhclo", "Clothes", "security_shoes", 1024, "JPEG", False),
        ),
    },
    "lao_qiu_tea_server": {
        "display_name": "老邱 (Lao Qiu, tea server)",
        "description": "older, wiry and high-cheeked Chengdu tea specialist",
        "object_name": "LaoQiuTeaServer",
        "output_name": "LaoQiuTeaServer.glb",
        "values": {
            "african": 0.0, "asian": 1.0, "caucasian": 0.0,
            "gender": 0.97, "age": 0.82, "weight": 0.50,
            "muscle": 0.46, "height": 0.54, "proportions": 0.53,
        },
        "details": (
            ("eyes/l-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/r-eye-epicanthus-in.target.gz", 0.13),
            ("eyes/l-eye-eyefold-down.target.gz", 0.08),
            ("eyes/r-eye-eyefold-down.target.gz", 0.08),
            ("eyes/l-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/r-eye-eyefold-concave.target.gz", 0.04),
            ("eyes/l-eye-height2-decr.target.gz", 0.08),
            ("eyes/r-eye-height2-decr.target.gz", 0.08),
            ("eyes/l-eye-bag-incr.target.gz", 0.05),
            ("eyes/r-eye-bag-incr.target.gz", 0.05),
            ("nose/nose-scale-depth-decr.target.gz", 0.04),
            ("nose/nose-width1-incr.target.gz", 0.09),
            ("nose/nose-width2-incr.target.gz", 0.07),
            ("nose/nose-nostrils-width-incr.target.gz", 0.06),
            ("cheek/l-cheek-bones-incr.target.gz", 0.13),
            ("cheek/r-cheek-bones-incr.target.gz", 0.13),
            ("cheek/l-cheek-volume-decr.target.gz", 0.08),
            ("cheek/r-cheek-volume-decr.target.gz", 0.08),
            ("head/head-diamond.target.gz", 0.06),
            ("head/head-scale-horiz-decr.target.gz", 0.025),
            ("chin/chin-width-incr.target.gz", 0.04),
            ("chin/chin-prominent-incr.target.gz", 0.025),
            ("mouth/mouth-scale-horiz-decr.target.gz", 0.02),
            ("mouth/mouth-laugh-lines-out.target.gz", 0.055),
            ("asym/asym-cheek-1-l.target.gz", 0.050),
            ("asym/asym-eye-3-r.target.gz", 0.030),
            ("asym/asym-mouth-2-l.target.gz", 0.022),
        ),
        "skin": "old_asian_male.mhmat",
        "texture_grades": {
            # The old Asian source skin is naturally ruddy; this restrained cool correction
            # keeps its photographed age detail without letting warm scene lights turn it orange.
            "skin": (0.94, 0.96, 1.00),
            "tea_trousers": (0.50, 0.52, 0.56),
            "tea_shoes": (0.48, 0.46, 0.42),
        },
        "texture_flat_colors": {
            "tea_shirt": (0.340, 0.420, 0.360),
        },
        "grey_hair": {"tea_hair": 0.62},
        "pieces": (
            ("eyes", "high-poly.mhclo", "Eyes", "eyes", 1024, "PNG", True),
            ("eyebrows", "eyebrow006.mhclo", "Eyebrows", "tea_brows", 512, "PNG", True),
            ("hair", "short01.mhclo", "Hair", "tea_hair", 1024, "PNG", True),
            ("clothes", "elvs_male_shirt_untucked_bd1.mhclo", "Clothes", "tea_shirt", 2048, "JPEG", False),
            ("clothes", "elvs_male_trouser.mhclo", "Clothes", "tea_trousers", 1024, "JPEG", False),
            ("clothes", "shoes02.mhclo", "Clothes", "tea_shoes", 1024, "JPEG", False),
        ),
    },
}

# Keep the 20 finished identities above as individually art-directed presets.
# The 62 generated production identities stay as compact catalog data resolved
# by pure Python, so this file does not grow by thousands of repeated preset
# lines while every character still receives a stable, deterministic preset.
CHARACTER_TOOLS = Path(__file__).resolve().parent
if str(CHARACTER_TOOLS) not in sys.path:
    sys.path.insert(0, str(CHARACTER_TOOLS))
from resolve_cast import load_generated_build_presets  # noqa: E402

AUTHORED_PRESET_NAMES = frozenset(PRESETS)
PRESETS.update(load_generated_build_presets(PRESETS))


# The first 20 individually art-directed presets predate the crowded-scene
# texture budget and deliberately keep their old requested sizes above.  The
# production profile applies export-only caps without changing their anatomy,
# targets, wardrobe, colours, material matching, or source asset licenses.
# Keeping this as a build profile also leaves a source-resolution escape hatch
# for offline close-up renders while the shipped GLBs stay inexpensive.
PRODUCTION_TEXTURE_CAPS = {
    "skin": 1024,
    "eyes": 512,
    "eyebrows": 256,
    "hair": 512,
    "garment": 512,
    "accessory": 256,
    "shoes": 256,
}

# These four wardrobes carry an extra mostly covered layer. Giving that small
# layer the accessory budget keeps even the most layered original identity at
# or below the 12 MiB soft target without softening the face, hair, outerwear,
# trousers, or role-defining uniform piece.
PRODUCTION_TEXTURE_OVERRIDES = {
    "lu_apo": {"apo_gilet": 256},
    "xiaozhou_student": {"student_tee": 256},
    "xiaozhou_courier": {"courier_tee": 256},
    "liu_security_officer": {"security_polo": 256},
}


def production_texture_preset(
    preset_name: str, preset: dict[str, object]
) -> dict[str, object]:
    """Return an identity-preserving copy with crowded-scene texture caps."""

    result = copy.deepcopy(preset)
    result["skin_texture_size"] = min(
        int(result.get("skin_texture_size", 2048)),
        PRODUCTION_TEXTURE_CAPS["skin"],
    )
    pieces = []
    for piece in result["pieces"]:
        subdir, filename, object_type, suffix, requested, image_format, transparent = piece
        lowered = f"{filename} {suffix}".lower()
        if subdir == "eyes":
            budget = "eyes"
        elif subdir == "eyebrows":
            budget = "eyebrows"
        elif subdir == "hair":
            budget = "hair"
        elif any(token in lowered for token in ("shoe", "trainer", "sneaker", "boot")):
            budget = "shoes"
        elif any(token in lowered for token in (
            "glasses", "spectacle", "hat", "cap", "scarf", "bag", "watch", "jewel",
        )):
            budget = "accessory"
        else:
            budget = "garment"
        cap = PRODUCTION_TEXTURE_OVERRIDES.get(preset_name, {}).get(
            str(suffix), PRODUCTION_TEXTURE_CAPS[budget]
        )
        pieces.append((
            subdir,
            filename,
            object_type,
            suffix,
            min(int(requested), cap),
            image_format,
            transparent,
        ))
    result["pieces"] = tuple(pieces)
    return result


def dynamic_import(package_suffix: str, symbol: str):
    """Resolve MPFB's package regardless of Blender's extension repository name."""

    for module_name in tuple(sys.modules):
        if module_name.endswith(package_suffix):
            module = importlib.import_module(module_name)
            if not hasattr(module, symbol):
                raise AttributeError(f"{module_name} has no {symbol}")
            return getattr(module, symbol)
    raise RuntimeError(
        f"MPFB is not enabled: no loaded module ends in {package_suffix!r}"
    )


HumanService = dynamic_import("mpfb.services.humanservice", "HumanService")
TargetService = dynamic_import("mpfb.services.targetservice", "TargetService")
AssetService = dynamic_import("mpfb.services.assetservice", "AssetService")
ExportService = dynamic_import("mpfb.services.exportservice", "ExportService")
ObjectService = dynamic_import("mpfb.services.objectservice", "ObjectService")
LocationService = dynamic_import("mpfb.services.locationservice", "LocationService")
HumanObjectProperties = dynamic_import(
    "mpfb.entities.objectproperties", "HumanObjectProperties"
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--preset",
        choices=tuple(PRESETS),
        default="xiaochen",
        help="Character design to build (default: xiaochen).",
    )
    parser.add_argument(
        "--list-presets",
        action="store_true",
        help="List the available character designs and exit without building.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="GLB path; defaults to assets/rigs/<preset output name>.",
    )
    parser.add_argument(
        "--blend",
        type=Path,
        default=None,
        help="Optionally save the staged Blender file for later art passes.",
    )
    parser.add_argument(
        "--texture-profile",
        choices=("source", "production"),
        default="source",
        help=(
            "Texture export policy: preserve preset-requested sizes (source) or apply "
            "the production 1K skin / 512px hair-and-garment caps."
        ),
    )
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(script_args)


def clear_scene() -> None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def set_human_value(human: bpy.types.Object, name: str, value: float) -> None:
    HumanObjectProperties.set_value(name, value, entity_reference=human)


def asset(name: str, subdir: str) -> str:
    resolved = AssetService.find_asset_absolute_path(name, asset_subdir=subdir)
    if resolved is None:
        raise RuntimeError(
            f"MPFB could not find {subdir}/{name}. Install the official "
            "MakeHuman System Assets CC0 pack first."
        )
    return resolved


def load_detail(human: bpy.types.Object, relative_path: str, weight: float) -> None:
    target_path = Path(LocationService.get_mpfb_data("targets")) / relative_path
    if not target_path.exists():
        raise RuntimeError(f"Bundled MPFB target is missing: {target_path}")
    TargetService.load_target(human, str(target_path), weight=weight)


def build_human(preset_name: str, texture_profile: str = "source") -> bpy.types.Object:
    preset = PRESETS[preset_name]
    if texture_profile == "production":
        preset = production_texture_preset(preset_name, preset)
    object_name = str(preset["object_name"])
    human = HumanService.create_human()
    human.name = f"{object_name}_Basemesh"

    # A particular young Beijing adult, not the old averaged mannequin.  MPFB's
    # macros are continuous phenotype controls; values near the middle remain
    # natural while still giving him a distinct height, weight, and build.
    values = preset["values"]
    for name, value in values.items():
        set_human_value(human, name, value)
    TargetService.reapply_macro_details(human)

    # Perfect bilateral symmetry is one of the strongest synthetic-face tells.
    # These are deliberately tiny: enough to break the mirror, not enough to
    # read as a facial expression or injury.
    for path, weight in preset["details"]:
        load_detail(human, path, weight)

    HumanService.set_character_skin(
        asset(str(preset["skin"]), "skins"),
        human,
        skin_type="GAMEENGINE",
    )

    # This is the exact naming convention rig.js already retargets.  It has 52
    # deform bones including fingers, comfortably below the web shader's 72.
    rig = HumanService.add_builtin_rig(human, "mixamo")
    rig.name = f"{object_name}_Rig"

    # A compact opaque-or-cutout wardrobe is a deliberate game budget: body,
    # eyes, brows, hair, role clothing, and shoes, with an occasional accessory.
    # Subdivision stays at zero; silhouette detail comes from authored meshes
    # and photographed textures.
    for subdir, filename, object_type, suffix, *_ in preset["pieces"]:
        piece = HumanService.add_mhclo_asset(
            asset(filename, subdir),
            human,
            asset_type=object_type,
            subdiv_levels=0,
            material_type="GAMEENGINE",
        )
        offset = float((preset.get("mesh_offsets") or {}).get(suffix, 0.0))
        if offset and piece is not None and piece.type == "MESH":
            piece.data.update()
            for vertex in piece.data.vertices:
                vertex.co += vertex.normal * offset
            piece.data.update()

    optimize_materials(preset_name, preset)
    return human


def optimized_image(
    source: bpy.types.Image,
    size: int,
    image_format: str,
    suffix: str,
    namespace: str,
    dark_brown_iris: bool = False,
    rgb_grade: tuple[float, float, float] | None = None,
    saturation: float = 1.0,
    grey_hair_amount: float = 0.0,
    tint_color: tuple[float, float, float] | None = None,
    flat_color: tuple[float, float, float] | None = None,
) -> bpy.types.Image:
    """Make an export-only texture copy without altering MPFB's source assets."""

    width, height = source.size
    largest = max(width, height)
    scale = min(1.0, size / largest) if largest else 1.0
    out_width = max(1, round(width * scale))
    out_height = max(1, round(height * scale))
    extension = ".jpg" if image_format == "JPEG" else ".png"
    temp_dir = Path(tempfile.gettempdir()) / f"chinesegame-{namespace}-textures"
    temp_dir.mkdir(parents=True, exist_ok=True)
    output = temp_dir / f"{suffix}{extension}"

    # Force the source pixels into memory before copying.  A copied, still-lazy
    # file image can otherwise save as an empty generated image in background mode.
    if source.has_data is False:
        source.pixels[0]
    copy = source.copy()
    copy.scale(out_width, out_height)
    if rgb_grade is not None:
        apply_rgb_grade(copy, rgb_grade)
    if saturation != 1.0:
        apply_saturation(copy, saturation)
    if grey_hair_amount > 0.0:
        apply_salt_pepper_hair(copy, grey_hair_amount)
    if tint_color is not None:
        apply_luminance_tint(copy, tint_color)
    if flat_color is not None:
        apply_flat_color(copy, flat_color)
    if dark_brown_iris:
        apply_dark_brown_irises(copy)
    copy.file_format = image_format
    copy.filepath_raw = str(output)

    settings = bpy.context.scene.render.image_settings
    old_format = settings.file_format
    old_mode = settings.color_mode
    old_quality = settings.quality
    old_compression = settings.compression
    try:
        settings.file_format = image_format
        settings.color_mode = "RGB" if image_format == "JPEG" else "RGBA"
        settings.quality = 88
        settings.compression = 35
        copy.save()
    finally:
        settings.file_format = old_format
        settings.color_mode = old_mode
        settings.quality = old_quality
        settings.compression = old_compression

    loaded = bpy.data.images.load(str(output), check_existing=False)
    loaded.name = f"GAME_{namespace}_{suffix}"
    return loaded


def apply_rgb_grade(
    image: bpy.types.Image, grade: tuple[float, float, float]
) -> None:
    """Bake identity-specific hair and skin colour into the portable GLB texture."""

    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    red, green, blue = grade
    for offset in range(0, len(pixels), 4):
        pixels[offset] *= red
        pixels[offset + 1] *= green
        pixels[offset + 2] *= blue
        # Alpha is coverage, not colour, and must remain exact for hair and brow cards.
    image.pixels.foreach_set(pixels)
    image.update()


def apply_saturation(image: bpy.types.Image, amount: float) -> None:
    """Reduce a loud source textile without flattening its woven value detail."""

    amount = max(0.0, min(1.0, amount))
    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    for offset in range(0, len(pixels), 4):
        red, green, blue = pixels[offset : offset + 3]
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        pixels[offset] = luminance + (red - luminance) * amount
        pixels[offset + 1] = luminance + (green - luminance) * amount
        pixels[offset + 2] = luminance + (blue - luminance) * amount
    image.pixels.foreach_set(pixels)
    image.update()


def apply_flat_color(
    image: bpy.types.Image, color: tuple[float, float, float]
) -> None:
    """Replace a source graphic with authored cloth colour and a restrained weave."""

    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    red, green, blue = color
    width = max(1, int(image.size[0]))
    for offset in range(0, len(pixels), 4):
        pixel = offset // 4
        x, y = pixel % width, pixel // width
        # Tiny deterministic warp/weft and grain variation survives mipmapping
        # without resurrecting logos or printed art from the source albedo.
        weave = (0.010 if x % 4 == 0 else 0.0) + (0.007 if y % 5 == 0 else 0.0)
        grain = ((((x * 73) ^ (y * 151)) & 31) / 31.0 - 0.5) * 0.012
        factor = 0.991 + weave + grain
        pixels[offset] = max(0.0, min(1.0, red * factor))
        pixels[offset + 1] = max(0.0, min(1.0, green * factor))
        pixels[offset + 2] = max(0.0, min(1.0, blue * factor))
        # Keep alpha untouched so this also works for future cutout accessories.
    image.pixels.foreach_set(pixels)
    image.update()


def apply_luminance_tint(
    image: bpy.types.Image, color: tuple[float, float, float]
) -> None:
    """Recolour a uniform while preserving lapel, shirt, tie and seam contrast.

    Flat colour is intentional for logo-bearing caps and workwear, but it made
    formal suits read as one synthetic block.  A luminance tint keeps the
    source garment's tailoring cues while moving its palette toward a clinical
    blue or restrained hotel colour.
    """

    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    red, green, blue = color
    for offset in range(0, len(pixels), 4):
        source_red, source_green, source_blue = pixels[offset : offset + 3]
        luminance = 0.2126 * source_red + 0.7152 * source_green + 0.0722 * source_blue
        factor = 0.55 + luminance * 0.90
        pixels[offset] = max(0.0, min(1.0, red * factor))
        pixels[offset + 1] = max(0.0, min(1.0, green * factor))
        pixels[offset + 2] = max(0.0, min(1.0, blue * factor))
        # Preserve cutout coverage exactly, just as the flat-colour path does.
    image.pixels.foreach_set(pixels)
    image.update()


def apply_salt_pepper_hair(image: bpy.types.Image, amount: float = 0.82) -> None:
    """Turn a dark photographed hair texture into natural warm salt-and-pepper.

    Multiplication can make hair darker but cannot create grey. This remaps the source's existing
    strand luminance into charcoal-to-silver values, so highlights and clumps provide the variation
    rather than a synthetic noise layer. Transparent card pixels remain untouched.
    """

    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    for offset in range(0, len(pixels), 4):
        if pixels[offset + 3] <= 0.01:
            continue
        red, green, blue = pixels[offset : offset + 3]
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        value = max(0.13, min(0.72, 0.12 + luminance * 1.72))
        # A trace of warmth keeps the grey from reading as untextured white plastic.
        target = (value * 1.025, value, value * 0.965)
        pixels[offset] = red * (1.0 - amount) + target[0] * amount
        pixels[offset + 1] = green * (1.0 - amount) + target[1] * amount
        pixels[offset + 2] = blue * (1.0 - amount) + target[2] * amount
    image.pixels.foreach_set(pixels)
    image.update()


def apply_dark_brown_irises(image: bpy.types.Image) -> None:
    """Turn the stock red-brown irises dark brown without touching the sclera.

    The System Assets brown-eye photograph has a strong red channel.  That is
    conspicuous under the game's warm lighting.  A mask made from redness,
    saturation, and darkness isolates the iris fibres; light low-saturation
    sclera, veins, pupil, catchlights, and every alpha value remain intact.
    """

    pixels = array("f", [0.0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    for offset in range(0, len(pixels), 4):
        red = pixels[offset]
        green = pixels[offset + 1]
        blue = pixels[offset + 2]
        high = max(red, green, blue)
        low = min(red, green, blue)
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        saturation = max(0.0, min(1.0, (high - low - 0.025) / 0.14))
        redness = max(0.0, min(1.0, (red - max(green, blue) - 0.015) / 0.14))
        darkness = max(0.0, min(1.0, (0.72 - luminance) / 0.36))
        mask = saturation * redness * darkness
        if mask <= 0.0:
            continue

        # Keep the photographed radial value variation, but shift its hue and
        # lower its value to the near-black brown common at conversational range.
        brown_red = high * 0.42
        brown_green = high * 0.23
        brown_blue = high * 0.12
        inverse = 1.0 - mask
        pixels[offset] = red * inverse + brown_red * mask
        pixels[offset + 1] = green * inverse + brown_green * mask
        pixels[offset + 2] = blue * inverse + brown_blue * mask
        # pixels[offset + 3] is deliberately untouched.
    image.pixels.foreach_set(pixels)
    image.update()


def optimize_materials(preset_name: str, preset: dict[str, object]) -> None:
    """Keep visible albedo detail and remove texture data this renderer ignores."""

    # Opaque photographs compress cleanly as JPEG.  Hair, brows, and eyes retain
    # PNG alpha, with their resolution matched to their on-screen footprint.
    specs = [
        {
            "matches": ("body",),
            # Authored close-up rigs retain their established 2K skin.  The 62
            # roster-resolved rigs request 1K here so a busy mall scene does not
            # inherit 23 simultaneous 2K body textures.
            "size": int(preset.get("skin_texture_size", 2048)),
            "format": "JPEG",
            "suffix": "skin",
            "transparent": False,
            "eye": False,
        }
    ]
    for subdir, filename, _object_type, suffix, size, image_format, transparent in preset["pieces"]:
        stem = Path(filename).stem.lower()
        matches = (stem,) + tuple(
            str(token).lower()
            for token in (preset.get("material_matches") or {}).get(suffix, ())
        )
        if subdir == "eyes":
            # Depending on MPFB version, the eye material may retain the mesh
            # name or the material's Eye_brown name.
            matches += ("eye_brown", "brown_eye")
        specs.append(
            {
                "matches": matches,
                "size": size,
                "format": image_format,
                "suffix": suffix,
                "transparent": transparent,
                "eye": subdir == "eyes",
            }
        )
    converted: dict[tuple[object, ...], bpy.types.Image] = {}

    for material in bpy.data.materials:
        if not material.use_nodes or material.node_tree is None:
            continue
        material_name = material.name.lower()
        spec = next(
            (
                candidate
                for candidate in specs
                if any(token in material_name for token in candidate["matches"])
            ),
            None,
        )
        if spec is None:
            continue
        size = int(spec["size"])
        image_format = str(spec["format"])
        suffix = str(spec["suffix"])
        is_eye = bool(spec["eye"])
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        principled = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        diffuse = next(
            (
                n
                for n in nodes
                if n.type == "TEX_IMAGE"
                and n.image is not None
                and (n.name == "DiffuseTexture" or "diffuse" in n.image.name.lower()
                     or "eye" in n.image.name.lower() or "eyebrow" in n.image.name.lower())
            ),
            None,
        )
        if principled is None or diffuse is None:
            raise RuntimeError(f"Could not identify the base color nodes in {material.name}")

        grade = (preset.get("texture_grades") or {}).get(suffix)
        if grade is not None:
            grade = tuple(float(channel) for channel in grade)
        saturation = float((preset.get("texture_saturation") or {}).get(suffix, 1.0))
        flat_color = (preset.get("texture_flat_colors") or {}).get(suffix)
        if flat_color is not None:
            flat_color = tuple(float(channel) for channel in flat_color)
        tint_color = (preset.get("texture_tints") or {}).get(suffix)
        if tint_color is not None:
            tint_color = tuple(float(channel) for channel in tint_color)
        if flat_color is not None and tint_color is not None:
            raise RuntimeError(f"{preset_name}/{suffix} requests both a flat colour and a tint")
        grey_hair = preset.get("grey_hair") or ()
        if isinstance(grey_hair, dict):
            grey_hair_amount = float(grey_hair.get(suffix, 0.0))
        else:
            grey_hair_amount = 0.82 if suffix in tuple(grey_hair) else 0.0
        key = (
            diffuse.image.filepath or diffuse.image.name,
            size,
            image_format,
            is_eye,
            grade,
            saturation,
            grey_hair_amount,
            tint_color,
            flat_color,
        )
        if key not in converted:
            converted[key] = optimized_image(
                diffuse.image,
                size,
                image_format,
                suffix,
                preset_name,
                dark_brown_iris=is_eye,
                rgb_grade=grade,
                saturation=saturation,
                grey_hair_amount=grey_hair_amount,
                tint_color=tint_color,
                flat_color=flat_color,
            )
        diffuse.image = converted[key]

        # MPFB creates a second unlinked image node for alpha.  One RGBA image
        # node can drive both sockets, avoiding duplicate glTF texture warnings.
        for node in tuple(nodes):
            if node != diffuse and node.type == "TEX_IMAGE":
                nodes.remove(node)
        links.new(diffuse.outputs["Color"], principled.inputs["Base Color"])
        if spec["transparent"]:
            links.new(diffuse.outputs["Alpha"], principled.inputs["Alpha"])
            material.surface_render_method = "DITHERED"
        else:
            principled.inputs["Alpha"].default_value = 1.0

        # gl.js currently derives lighting from geometry normals.  Shipping a
        # 9 MB 4K normal map that is never sampled adds download time, not detail.
        for link in tuple(principled.inputs["Normal"].links):
            links.remove(link)
        for node in tuple(nodes):
            if node.type == "NORMAL_MAP":
                nodes.remove(node)


def stage_for_export(human: bpy.types.Object) -> bpy.types.Object:
    export_root = ExportService.create_character_copy(human, name_suffix="_export")
    export_mesh = ObjectService.find_object_of_type_amongst_nearest_relatives(
        export_root, "Basemesh"
    )
    if export_mesh is None:
        raise RuntimeError("MPFB export copy has no basemesh")

    # The game loader intentionally ignores morph targets.  Collapse the macro
    # and asymmetry keys into real vertex positions before exporting.
    TargetService.bake_targets(export_mesh)
    ExportService.bake_modifiers_remove_helpers(
        export_mesh,
        bake_masks=True,
        bake_subdiv=False,
        remove_helpers=True,
        also_proxy=True,
    )

    # MPFB's copy is a one-level hierarchy: armature root plus directly parented
    # meshes.  Export only that copy, never the editable source character.
    bpy.ops.object.select_all(action="DESELECT")
    export_root.select_set(True)
    for child in ObjectService.get_list_of_children(export_root):
        child.select_set(True)
    bpy.context.view_layer.objects.active = export_root
    return export_root


def character_stats(export_root: bpy.types.Object) -> dict[str, object]:
    children = ObjectService.get_list_of_children(export_root)
    meshes = [obj for obj in children if obj.type == "MESH"]
    armatures = [export_root] if export_root.type == "ARMATURE" else []
    armatures.extend(obj for obj in children if obj.type == "ARMATURE")
    bones = sum(len(obj.data.bones) for obj in armatures)
    triangles = 0
    vertices = 0
    materials = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        vertices += len(obj.data.vertices)
        materials += len(obj.data.materials)
    return {
        "objects": len(children) + 1,
        "meshes": len(meshes),
        "vertices": vertices,
        "triangles": triangles,
        "materials": materials,
        "bones": bones,
        "mesh_names": [obj.name for obj in meshes],
    }


def export_glb(export_root: bpy.types.Object, output: Path) -> None:
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_image_format="AUTO",
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_influence_nb=4,
        export_all_influences=False,
        export_morph=False,
        export_def_bones=True,
        export_leaf_bone=False,
        export_armature_object_remove=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
        export_try_sparse_sk=False,
    )
    if result != {"FINISHED"}:
        raise RuntimeError(f"glTF export failed: {result}")
    print(f"MPFB_GLTF {json.dumps(character_stats(export_root), ensure_ascii=False)}")
    print(f"MPFB_GLTF wrote={output} bytes={output.stat().st_size}")


def main() -> None:
    args = arguments()
    if args.list_presets:
        for name, preset in PRESETS.items():
            print(f"{name}\t{preset['display_name']} — {preset['description']}")
        return

    preset = PRESETS[args.preset]
    output = args.output
    if output is None:
        output = (
            DEFAULT_OUTPUT
            if args.preset == "xiaochen"
            else ROOT / "assets" / "rigs" / str(preset["output_name"])
        )
    clear_scene()
    human = build_human(args.preset, args.texture_profile)
    export_root = stage_for_export(human)
    export_glb(export_root, output)
    if args.blend:
        blend_path = args.blend.resolve()
        blend_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
        print(f"MPFB_BLEND wrote={blend_path}")


if __name__ == "__main__":
    main()
