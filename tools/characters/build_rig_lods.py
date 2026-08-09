"""Pack three skinned LODs of one authored character into one GLB.

The source GLB remains the visual authority.  LOD1 and LOD2 are decimated copies of
the same skinned mesh objects, using the same armature, materials, images, proportions,
and bind pose.  Keeping them in one GLB stores the character's textures only once and
prevents a distant NPC from becoming a different procedural person.

Run with Blender:

    /Applications/Blender.app/Contents/MacOS/Blender --background \
      --python tools/characters/build_rig_lods.py -- \
      assets/rigs/XiaoChen.glb assets/rigs/XiaoChen.lod.glb
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path, nargs="?")
    parser.add_argument("--mid", type=float, default=0.34,
                        help="LOD1 triangle ratio (default: 0.34)")
    parser.add_argument("--far", type=float, default=0.10,
                        help="LOD2 triangle ratio (default: 0.10)")
    return parser.parse_args(raw)


def triangles(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def armature_meshes() -> list[bpy.types.Object]:
    out = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        if obj.parent and obj.parent.type == "ARMATURE":
            out.append(obj)
            continue
        if any(mod.type == "ARMATURE" for mod in obj.modifiers):
            out.append(obj)
    return out


def safe_ratio(obj: bpy.types.Object, wanted: float, lod: int) -> float:
    """Keep wardrobe surfaces closed while reducing the expensive continuous body mesh."""
    count = max(1, triangles(obj))
    name = obj.name.lower()
    # MPFB clothes are open, layered shells with cuffs, waistlines and UV-seam duplicates.  A
    # brutal 10% collapse punches visible windows through them when the skeleton bends, even
    # though it works well on the continuous basemesh.  Clothes are only a minority of total
    # triangles, so preserve their topology and take the large saving from the body instead.
    if any(word in name for word in ("eye", "brow", "lash", "glasses")):
        minimum, floor = (180, 0.62) if lod == 1 else (72, 0.42)
    elif any(word in name for word in ("hair", "short", "bob", "braid", "ponytail")):
        minimum, floor = (520, 0.55) if lod == 1 else (180, 0.40)
    elif any(word in name for word in ("hat", "cap")):
        # Caps matter to an identity's outline, but they are small closed shells rather than
        # bend-heavy sleeves or trousers. Treating a 6K-triangle cap like a full garment kept
        # 42% of it at LOD2 and pushed an otherwise valid nine-part uniform over the entire far
        # character budget. These floors retain more of the cap than the original 10% build while
        # leaving the pixels for the face, vest, and body that actually carry the distant read.
        minimum, floor = (260, 0.34) if lod == 1 else (120, 0.18)
    elif any(word in name for word in (
        "shirt", "trouser", "pants", "jean", "skirt", "dress", "jacket", "coat", "suit",
        "shoe", "boot", "sneaker", "uniform", "vest", "apron", "top", "sweater", "hoodie",
    )):
        minimum, floor = (520, 0.60) if lod == 1 else (240, 0.42)
    else:
        minimum, floor = (260, 0.0) if lod == 1 else (90, 0.0)
    return min(1.0, max(wanted, floor, minimum / count))


def duplicate_lod(source: bpy.types.Object, lod: int, wanted: float) -> bpy.types.Object:
    dup = source.copy()
    dup.data = source.data.copy()
    source.users_collection[0].objects.link(dup)
    base = source.name.removeprefix("LOD0__")
    dup.name = f"LOD{lod}__{base}"
    dup.data.name = f"LOD{lod}__{source.data.name.removeprefix('LOD0__')}"
    dup["game_lod"] = lod

    ratio = safe_ratio(dup, wanted, lod)
    modifier = dup.modifiers.new(name=f"GameLOD{lod}", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True

    bpy.ops.object.select_all(action="DESELECT")
    dup.select_set(True)
    bpy.context.view_layer.objects.active = dup
    # Decimation must see the bind-pose mesh, not the result of the Armature modifier.  Applying
    # it after Armature makes Blender bake the evaluated deformation and warns that the result may
    # not preserve skinning.  Move it to the top; applying only Decimate leaves the armature and
    # all vertex groups intact for export.
    while dup.modifiers.find(modifier.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=modifier.name)
    before = triangles(dup)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = triangles(dup)
    if after >= before and ratio < 0.99:
        raise RuntimeError(f"decimation did not reduce {source.name}: {before} -> {after}")

    # Collapse creates new vertices at interpolated positions.  Its interpolation of dozens of
    # overlapping bone groups is not reliable enough for clothing: after an elbow or knee bends,
    # a simplified sleeve can pull away from the body and read as holes.  Re-project skin weights
    # from the unchanged authored surface, then enforce the renderer's four-weight contract.
    transfer = dup.modifiers.new(name=f"GameSkinWeights{lod}", type="DATA_TRANSFER")
    transfer.object = source
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "POLYINTERP_NEAREST"
    transfer.layers_vgroup_select_src = "ALL"
    transfer.layers_vgroup_select_dst = "NAME"
    transfer.mix_mode = "REPLACE"
    while dup.modifiers.find(transfer.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=transfer.name)
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    return dup


def stats(meshes: list[bpy.types.Object]) -> dict[str, object]:
    by_lod = {0: 0, 1: 0, 2: 0}
    objects = {0: 0, 1: 0, 2: 0}
    for obj in meshes:
        name = obj.name
        lod = 1 if name.startswith("LOD1__") else 2 if name.startswith("LOD2__") else 0
        by_lod[lod] += triangles(obj)
        objects[lod] += 1
    return {"triangles": by_lod, "objects": objects}


def main() -> None:
    args = arguments()
    source = (ROOT / args.input).resolve() if not args.input.is_absolute() else args.input.resolve()
    output_arg = args.output or source.with_name(source.stem + ".lod.glb")
    output = (ROOT / output_arg).resolve() if not output_arg.is_absolute() else output_arg.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    if not 0.02 <= args.far < args.mid < 1.0:
        raise ValueError("expected 0.02 <= --far < --mid < 1")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    originals = armature_meshes()
    if not originals:
        raise RuntimeError("source has no skinned mesh objects")

    # Names are exported into glTF nodes and are the loader's LOD contract.  Custom extras make
    # the files self-describing in other tools without requiring them to parse that name.
    for obj in originals:
        if not obj.name.startswith("LOD0__"):
            obj.name = "LOD0__" + obj.name
            obj.data.name = "LOD0__" + obj.data.name
        obj["game_lod"] = 0

    made = list(originals)
    for obj in originals:
        made.append(duplicate_lod(obj, 1, args.mid))
        made.append(duplicate_lod(obj, 2, args.far))

    bpy.ops.object.select_all(action="SELECT")
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
        export_extras=True,
        export_draco_mesh_compression_enable=False,
        export_try_sparse_sk=False,
    )
    if result != {"FINISHED"}:
        raise RuntimeError(f"glTF export failed: {result}")
    print("RIG_LODS " + json.dumps(stats(made), sort_keys=True))
    print(f"RIG_LODS wrote={output} bytes={output.stat().st_size}")


if __name__ == "__main__":
    main()
