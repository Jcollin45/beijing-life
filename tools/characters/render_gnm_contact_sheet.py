#!/usr/bin/env python3
"""Render neutral front and three-quarter contact sheets in Blender.

Invoke through Blender (not the system Python)::

  /Applications/Blender.app/Contents/MacOS/Blender --background \
    --python tools/characters/render_gnm_contact_sheet.py -- \
    --input .cache/gnm-asian-samples

The render uses Eevee on CPU and deliberately neutral materials so geometry is
judged independently from complexion, hair, clothes, or a photographic style.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


NEUTRAL_SKIN = (0.22, 0.26, 0.32, 1.0)
COMPONENT_COLORS = {
    "scleras": (0.58, 0.58, 0.55, 1.0),
    "irises": (0.08, 0.035, 0.018, 1.0),
    "pupils": (0.004, 0.004, 0.004, 1.0),
}


def _parse_args() -> argparse.Namespace:
  script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
      "--input",
      type=Path,
      default=Path(".cache/gnm-asian-samples"),
  )
  parser.add_argument("--width", type=int, default=1800)
  parser.add_argument("--height", type=int, default=2000)
  return parser.parse_args(script_args)


def _clear_scene() -> None:
  bpy.ops.object.select_all(action="SELECT")
  bpy.ops.object.delete(use_global=False)
  for datablocks in (
      bpy.data.meshes,
      bpy.data.curves,
      bpy.data.materials,
      bpy.data.cameras,
      bpy.data.lights,
  ):
    # Preserve nothing from Blender's default startup scene.
    for datablock in list(datablocks):
      if datablock.users == 0:
        datablocks.remove(datablock)


def _material(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
  material = bpy.data.materials.new(name)
  material.diffuse_color = color
  material.use_nodes = True
  principled = material.node_tree.nodes.get("Principled BSDF")
  principled.inputs["Base Color"].default_value = color
  principled.inputs["Roughness"].default_value = roughness
  principled.inputs["Specular IOR Level"].default_value = 0.28
  return material


def _import_obj(path: Path, object_name: str) -> bpy.types.Object:
  # These generated OBJs only contain ``v`` and triangular ``f`` records. A
  # tiny direct loader preserves GNM's X-horizontal/Y-up/Z-forward coordinate
  # frame; Blender's general OBJ importer would rotate Y-up data to Z-up.
  vertices = []
  faces = []
  for line in path.read_text(encoding="utf-8").splitlines():
    if line.startswith("v "):
      vertices.append(tuple(float(value) for value in line.split()[1:4]))
    elif line.startswith("f "):
      faces.append(tuple(int(value) - 1 for value in line.split()[1:4]))
  mesh = bpy.data.meshes.new(f"{object_name}_mesh")
  mesh.from_pydata(vertices, [], faces)
  mesh.update()
  obj = bpy.data.objects.new(object_name, mesh)
  bpy.context.collection.objects.link(obj)
  return obj


def _smooth_mesh(obj: bpy.types.Object) -> None:
  for polygon in obj.data.polygons:
    polygon.use_smooth = True


def _add_label(
    text: str,
    location: tuple[float, float, float],
    material: bpy.types.Material,
) -> None:
  curve = bpy.data.curves.new(f"label_{text}", type="FONT")
  curve.body = text
  curve.align_x = "CENTER"
  curve.align_y = "CENTER"
  curve.size = 0.052
  curve.extrude = 0.0005
  curve.materials.append(material)
  obj = bpy.data.objects.new(f"label_{text}", curve)
  obj.location = location
  # Text lies in XY and faces +Z by default.
  bpy.context.collection.objects.link(obj)


def _point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
  direction = Vector(target) - obj.location
  obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _add_area_light(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    size: float,
    target: tuple[float, float, float],
) -> None:
  light_data = bpy.data.lights.new(name, type="AREA")
  light_data.energy = energy
  light_data.shape = "DISK"
  light_data.size = size
  light = bpy.data.objects.new(name, light_data)
  light.location = location
  _point_at(light, target)
  bpy.context.collection.objects.link(light)


def _build_scene(input_dir: Path, yaw_degrees: float) -> None:
  metadata = json.loads((input_dir / "metadata.json").read_text(encoding="utf-8"))
  samples = metadata["samples"]
  _clear_scene()

  neutral_skin = _material("neutral_clay", NEUTRAL_SKIN, 0.62)
  sclera = _material("sclera", COMPONENT_COLORS["scleras"], 0.48)
  iris = _material("iris", COMPONENT_COLORS["irises"], 0.42)
  pupil = _material("pupil", COMPONENT_COLORS["pupils"], 0.38)
  label_material = _material("label", (0.88, 0.90, 0.94, 1.0), 0.78)
  materials = {"scleras": sclera, "irises": iris, "pupils": pupil}

  columns = 3
  x_step = 0.48
  y_step = 0.43
  x_origin = -0.5 * (columns - 1) * x_step
  rows = math.ceil(len(samples) / columns)
  y_origin = 0.5 * (rows - 1) * y_step
  yaw = math.radians(yaw_degrees)

  for index, sample in enumerate(samples):
    gender = sample["gender_label"]
    column = index % columns
    row = index // columns
    sample_x = x_origin + column * x_step
    sample_y = y_origin - row * y_step
    bounds_min = sample["bounds_min_m"]
    bounds_max = sample["bounds_max_m"]
    center_x = 0.5 * (bounds_min[0] + bounds_max[0])
    center_y = 0.5 * (bounds_min[1] + bounds_max[1])
    # The source face points +Z and uses +Y as up. Center every sample before
    # rotating, then place it in the contact-sheet grid.
    for component, info in sample["components"].items():
      obj = _import_obj(
          input_dir / info["path"],
          f"{sample['id']}_{component}",
      )
      obj.data.materials.append(
          neutral_skin if component == "skin"
          else materials[component]
      )
      obj.location = (sample_x - center_x, sample_y - center_y, 0.0)
      obj.rotation_mode = "XYZ"
      obj.rotation_euler[1] = yaw
      _smooth_mesh(obj)

    _add_label(
        f"{'F' if gender == 'FEMALE' else 'M'}{sample['seed']:02d}",
        # Keep labels behind the head depth so their geometry cannot cast
        # letter-shaped shadows across a neighboring face.
        (sample_x, sample_y - 0.188, -0.18),
        label_material,
    )

  scene = bpy.context.scene
  scene.render.engine = "BLENDER_EEVEE_NEXT"
  scene.render.resolution_x = args.width
  scene.render.resolution_y = args.height
  scene.render.resolution_percentage = 100
  scene.render.image_settings.file_format = "PNG"
  scene.render.film_transparent = False
  scene.render.image_settings.color_mode = "RGB"
  scene.render.image_settings.color_depth = "8"
  scene.render.image_settings.compression = 20
  scene.render.resolution_percentage = 100
  scene.view_settings.look = "AgX - Medium High Contrast"
  scene.view_settings.exposure = -0.65

  world = bpy.data.worlds.new("contact_sheet_world")
  world.use_nodes = True
  world.node_tree.nodes["Background"].inputs["Color"].default_value = (
      0.025,
      0.032,
      0.047,
      1.0,
  )
  world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12
  scene.world = world

  camera_data = bpy.data.cameras.new("contact_sheet_camera")
  camera_data.type = "ORTHO"
  camera_data.ortho_scale = 1.82
  camera = bpy.data.objects.new("contact_sheet_camera", camera_data)
  camera.location = (0.0, 0.0, 4.0)
  camera.rotation_euler = (0.0, 0.0, 0.0)
  camera.data.lens = 80
  scene.collection.objects.link(camera)
  scene.camera = camera

  _add_area_light("key", (-1.2, 1.5, 2.4), 240.0, 2.1, (0.0, 0.0, 0.0))
  _add_area_light("fill", (1.4, 0.5, 1.8), 115.0, 2.4, (0.0, 0.0, 0.0))
  _add_area_light("rim", (0.0, -1.8, 0.7), 180.0, 1.8, (0.0, 0.0, 0.0))


def main() -> None:
  global args
  args = _parse_args()
  input_dir = args.input.resolve()
  for filename, yaw in (
      ("contact-front.png", 0.0),
      ("contact-three-quarter.png", 24.0),
  ):
    _build_scene(input_dir, yaw)
    output_path = input_dir / filename
    bpy.context.scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {output_path}")


if __name__ == "__main__":
  main()
