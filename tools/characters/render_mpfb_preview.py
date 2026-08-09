"""Render neutral full-body and portrait checks from an MPFB character blend.

Blender opens the character file before running this script, for example:

    blender art/character-concepts/WangAyi.blend --background \
      --python tools/characters/render_mpfb_preview.py

The output name and both camera distances are derived from the export rig and
its world-space bounds. Optional arguments belong after Blender's ``--``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "art" / "character-concepts"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=OUTPUT,
        help="Directory for the two PNG files.",
    )
    parser.add_argument(
        "--name",
        default=None,
        help="Output basename; by default it is derived from the export rig.",
    )
    parser.add_argument(
        "--full-scale",
        type=float,
        default=1.0,
        help="Multiplier for the automatically calculated full-body distance.",
    )
    parser.add_argument(
        "--portrait-scale",
        type=float,
        default=1.0,
        help="Multiplier for the automatically calculated portrait distance.",
    )
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(script_args)


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
    target: tuple[float, float, float] = (0.0, 0.0, 1.2),
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    point_at(light, target)
    return light


def isolate_export() -> bpy.types.Object:
    roots = [
        obj
        for obj in bpy.data.objects
        if obj.type == "ARMATURE" and obj.name.endswith("_export")
    ]
    if len(roots) != 1:
        raise RuntimeError(f"Expected one export armature, found {[o.name for o in roots]}")
    root = roots[0]
    keep = {root, *root.children}
    for obj in bpy.data.objects:
        if obj not in keep and obj.type in {"MESH", "ARMATURE"}:
            obj.hide_render = True
            obj.hide_viewport = True
    root.location = (0.0, 0.0, 0.0)
    root.rotation_euler = (0.0, 0.0, 0.0)
    return root


def export_bounds(root: bpy.types.Object) -> tuple[Vector, Vector]:
    """Return world bounds for every rendered mesh parented to the export rig."""

    bpy.context.view_layer.update()
    meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"Export rig {root.name} has no mesh descendants")
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
    high = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
    return low, high


def output_name(root: bpy.types.Object, override: str | None) -> str:
    if override:
        return override
    name = root.name
    for suffix in ("_Rig_export", "_export", "_Rig"):
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    return name or Path(bpy.data.filepath).stem


def stage() -> tuple[bpy.types.Object, bpy.types.Object, Vector, Vector]:
    root = isolate_export()
    low, high = export_bounds(root)
    center = (low + high) * 0.5
    height = high.z - low.z
    if height <= 0.0:
        raise RuntimeError(f"Invalid character bounds: low={tuple(low)} high={tuple(high)}")

    bpy.ops.mesh.primitive_plane_add(
        size=max(8.0, height * 10.0),
        location=(center.x, center.y, low.z - max(0.003, height * 0.002)),
    )
    ground = bpy.context.object
    ground.name = "Preview ground"
    mat = bpy.data.materials.new("Preview ground")
    mat.diffuse_color = (0.12, 0.13, 0.15, 1.0)
    ground.data.materials.append(mat)

    light_scale = height / 1.70
    energy_scale = light_scale * light_scale
    target = (center.x, center.y, low.z + height * 0.70)
    add_area(
        "Key",
        (center.x - height * 1.29, center.y - height * 2.06, low.z + height * 2.0),
        1050 * energy_scale,
        3.0 * light_scale,
        (1.0, 0.82, 0.68),
        target,
    )
    add_area(
        "Fill",
        (center.x + height * 1.47, center.y - height * 1.06, low.z + height * 1.35),
        650 * energy_scale,
        2.6 * light_scale,
        (0.67, 0.80, 1.0),
        target,
    )
    add_area(
        "Rim",
        (center.x + height * 0.59, center.y + height * 1.18, low.z + height * 1.82),
        850 * energy_scale,
        2.0 * light_scale,
        (0.86, 0.92, 1.0),
        target,
    )

    camera_data = bpy.data.cameras.new("Preview camera")
    camera = bpy.data.objects.new("Preview camera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    return root, camera, low, high


def render(
    camera: bpy.types.Object,
    output_path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    lens: float,
    resolution: tuple[int, int],
) -> None:
    scene = bpy.context.scene
    camera.location = location
    camera.data.lens = lens
    point_at(camera, target)
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    print(f"MPFB_PREVIEW wrote={scene.render.filepath}")


def main() -> None:
    args = arguments()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.035, 0.045, 0.065)
    root, camera, low, high = stage()
    name = output_name(root, args.name)
    center = (low + high) * 0.5
    width = high.x - low.x
    height = high.z - low.z
    depth = high.y - low.y
    front_y = low.y

    # MPFB faces Blender -Y; glTF's axis conversion turns that into the game's +Z.
    # Distance scales are calibrated from the old hand-framed Xiao Chen render,
    # while using real bounds keeps adults, children, and unusual builds equally
    # well filled. Width/depth terms prevent very broad clothing from clipping.
    full_distance = max(height * 2.55, width * 4.0, depth * 5.0) * args.full_scale
    full_target = (center.x, center.y, low.z + height * 0.53)
    render(
        camera,
        output_dir / f"{name}-full.png",
        (center.x, front_y - full_distance, low.z + height * 0.65),
        full_target,
        72.0,
        (900, 1200),
    )

    portrait_distance = max(height * 0.75, width * 1.35) * args.portrait_scale
    portrait_target_z = high.z - height * 0.12
    render(
        camera,
        output_dir / f"{name}-portrait.png",
        (center.x, front_y - portrait_distance, portrait_target_z + height * 0.025),
        (center.x, center.y, portrait_target_z),
        92.0,
        (1000, 1000),
    )
    print(
        "MPFB_PREVIEW "
        f"name={name} bounds=({width:.3f}, {depth:.3f}, {height:.3f}) "
        f"full_distance={full_distance:.3f} portrait_distance={portrait_distance:.3f}"
    )


if __name__ == "__main__":
    main()
