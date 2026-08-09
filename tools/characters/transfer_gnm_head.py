#!/usr/bin/env python3
"""Transfer a GNM scan-trained head shape onto a game-ready MPFB GLB.

The source body's topology, UVs, skin weights, textures and skeleton are kept.
Only the exterior head vertices are non-rigidly fitted and blended toward a GNM
identity.  Run this with the isolated GNM authoring environment::

  .cache/gnm-venv/bin/python tools/characters/transfer_gnm_head.py \
    --input assets/rigs/XiaoChen.glb \
    --target .cache/gnm-asian-samples/male-s083/skin.obj \
    --output art/character-concepts/XiaoChen-GNM-M83.glb

GNM exposes a broad ASIAN semantic sample, not a Chinese-ethnicity classifier.
The selected geometry is an art reference which still requires human review.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import struct

import numpy as np
from scipy.spatial import cKDTree
import trimesh


JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
COMPONENT_DTYPES = {
    5121: np.dtype("<u1"),
    5123: np.dtype("<u2"),
    5125: np.dtype("<u4"),
    5126: np.dtype("<f4"),
}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Source skinned GLB.")
    parser.add_argument("--target", type=Path, required=True, help="GNM exterior skin OBJ.")
    parser.add_argument("--output", type=Path, required=True, help="Non-destructive candidate GLB.")
    parser.add_argument(
        "--strength", type=float, default=0.70,
        help="Blend from MPFB to fitted GNM shape (default: 0.70).",
    )
    parser.add_argument(
        "--head-ratio", type=float, default=0.17,
        help="Top fraction of body height used to isolate the source head.",
    )
    parser.add_argument(
        "--max-displacement", type=float, default=0.035,
        help="Safety clamp per vertex in metres (default: 0.035).",
    )
    return parser.parse_args()


def read_glb(path: Path) -> tuple[dict[str, object], bytearray, list[tuple[int, bytes]]]:
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<III", raw, 0)
    if magic != 0x46546C67 or version != 2 or total != len(raw):
        raise ValueError(f"Not a valid glTF 2 GLB: {path}")
    chunks: list[tuple[int, bytes]] = []
    graph = None
    binary = None
    offset = 12
    while offset < len(raw):
        length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        data = raw[offset : offset + length]
        offset += length
        chunks.append((chunk_type, data))
        if chunk_type == JSON_CHUNK:
            graph = json.loads(data.rstrip(b"\x00 ").decode("utf-8"))
        elif chunk_type == BIN_CHUNK:
            binary = bytearray(data)
    if graph is None or binary is None:
        raise ValueError("GLB requires JSON and BIN chunks")
    return graph, binary, chunks


def accessor_array(
    graph: dict[str, object], binary: bytearray, accessor_index: int, width: int
) -> np.ndarray:
    accessor = graph["accessors"][accessor_index]
    view = graph["bufferViews"][accessor["bufferView"]]
    dtype = COMPONENT_DTYPES[accessor["componentType"]]
    offset = int(view.get("byteOffset", 0)) + int(accessor.get("byteOffset", 0))
    count = int(accessor["count"])
    packed = width * dtype.itemsize
    stride = int(view.get("byteStride", packed))
    if stride == packed:
        return np.ndarray((count, width), dtype=dtype, buffer=binary, offset=offset)
    # Blender's character export is packed, but retaining the strided read makes a clear error
    # possible if another exporter is used. Writes deliberately remain packed-only below.
    return np.ndarray(
        (count, width), dtype=dtype, buffer=binary, offset=offset,
        strides=(stride, dtype.itemsize),
    )


def find_body_primitive(graph: dict[str, object]) -> dict[str, object]:
    materials = graph.get("materials", [])
    for mesh in graph.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            material_index = primitive.get("material")
            material_name = ""
            if material_index is not None and material_index < len(materials):
                material_name = str(materials[material_index].get("name", "")).lower()
            if material_name.endswith(".body") or material_name.endswith(".skin"):
                if primitive.get("mode", 4) != 4:
                    raise ValueError("Body primitive is not TRIANGLES")
                return primitive
    raise ValueError("Could not find a .body or .skin material primitive")


def largest_component_above(mesh: trimesh.Trimesh, cutoff: float) -> trimesh.Trimesh:
    face_mask = np.all(mesh.vertices[mesh.faces, 1] > cutoff, axis=1)
    cropped = mesh.submesh([face_mask], append=True, repair=False)
    components = cropped.split(only_watertight=False, repair=False)
    if not components:
        raise ValueError("Head cutoff selected no connected mesh")
    return max(components, key=lambda component: len(component.vertices))


def smoothstep(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def feature_protection(vertices: np.ndarray, bounds: np.ndarray) -> np.ndarray:
    """Keep incompatible eye/mouth loops from being pulled onto GNM's topology.

    GNM and MPFB describe the same anatomy with different edge flow. Closest-point fitting around
    an opening can therefore match an eyelid to the eyeball rim and enlarge the socket. Identity
    comes from the surrounding brow, cheek, jaw and cranium here; the already-reviewed MPFB eye
    and lip loops retain their own shape.
    """

    lo, hi = bounds
    span = hi - lo
    center_x = 0.5 * (lo[0] + hi[0])
    half_width = 0.5 * span[0]
    eye_y = lo[1] + span[1] * 0.53
    eye_z = lo[2] + span[2] * 0.86
    protection = np.ones(len(vertices), dtype=np.float64)
    for side in (-1.0, 1.0):
        eye = np.array([center_x + side * half_width * 0.36, eye_y, eye_z])
        distance = np.sqrt(np.sum(((vertices - eye) / np.array([0.052, 0.036, 0.043])) ** 2, axis=1))
        eye_fade = 0.04 + 0.96 * smoothstep((distance - 0.72) / 0.85)
        protection = np.minimum(protection, eye_fade)

    mouth = np.array([center_x, lo[1] + span[1] * 0.24, lo[2] + span[2] * 0.91])
    distance = np.sqrt(np.sum(((vertices - mouth) / np.array([0.052, 0.030, 0.036])) ** 2, axis=1))
    mouth_fade = 0.20 + 0.80 * smoothstep((distance - 0.70) / 0.90)
    return np.minimum(protection, mouth_fade)


def aligned_target(source_head: trimesh.Trimesh, target_path: Path) -> trimesh.Trimesh:
    target_full = trimesh.load_mesh(target_path, process=False)
    if not isinstance(target_full, trimesh.Trimesh):
        raise ValueError(f"Target is not a triangle mesh: {target_path}")
    # GNM includes neck and shoulder geometry. Match the vertical span of MPFB's connected head
    # component so shoulders do not get pulled onto the jaw during closest-point registration.
    target_cutoff = target_full.bounds[1, 1] - source_head.extents[1] * 1.06
    target = largest_component_above(target_full, target_cutoff)
    scale = source_head.extents[1] / target.extents[1]
    target.vertices *= scale
    source_center = source_head.bounds.mean(axis=0)
    target_center = target.bounds.mean(axis=0)
    target.vertices += source_center - target_center
    return target


def fit_head(
    source_head: trimesh.Trimesh,
    target: trimesh.Trimesh,
    strength: float,
    max_displacement: float,
) -> tuple[np.ndarray, dict[str, float]]:
    fitted = trimesh.registration.nricp_amberg(
        source_head.copy(), target.copy(),
        steps=((0.05, 0.0, 0.35, 8), (0.025, 0.0, 0.20, 8), (0.01, 0.0, 0.0, 8)),
        eps=1e-5,
        distance_threshold=0.08,
        use_faces=True,
        use_vertex_normals=True,
    )
    delta = np.asarray(fitted) - source_head.vertices
    lengths = np.linalg.norm(delta, axis=1)
    if not np.all(np.isfinite(delta)) or float(lengths.max()) > 0.10:
        raise ValueError("Non-rigid fit diverged; refusing to write a candidate")
    clamp = np.minimum(1.0, max_displacement / np.maximum(lengths, 1e-9))
    # Fade through the lowest four centimetres. The neck keeps the source body's dimensions and
    # the head deformation arrives smoothly above it instead of opening a seam at the cutoff.
    neck = source_head.bounds[0, 1]
    taper = smoothstep((source_head.vertices[:, 1] - neck) / 0.04)
    protect = feature_protection(source_head.vertices, source_head.bounds)
    weighted = delta * (strength * clamp * taper * protect)[:, None]
    return source_head.vertices + weighted, {
        "fit_mean_mm": float(lengths.mean() * 1000.0),
        "fit_max_mm": float(lengths.max() * 1000.0),
        "applied_mean_mm": float(np.linalg.norm(weighted, axis=1).mean() * 1000.0),
        "applied_max_mm": float(np.linalg.norm(weighted, axis=1).max() * 1000.0),
    }


def replace_chunk(
    graph: dict[str, object], binary: bytearray, original: list[tuple[int, bytes]]
) -> bytes:
    json_data = json.dumps(graph, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    json_data += b" " * ((-len(json_data)) % 4)
    bin_data = bytes(binary)
    bin_data += b"\x00" * ((-len(bin_data)) % 4)
    chunks: list[tuple[int, bytes]] = []
    for chunk_type, data in original:
        if chunk_type == JSON_CHUNK:
            chunks.append((chunk_type, json_data))
        elif chunk_type == BIN_CHUNK:
            chunks.append((chunk_type, bin_data))
        else:
            chunks.append((chunk_type, data))
    body = b"".join(struct.pack("<II", len(data), kind) + data for kind, data in chunks)
    return struct.pack("<III", 0x46546C67, 2, 12 + len(body)) + body


def main() -> None:
    args = arguments()
    if not 0.0 <= args.strength <= 1.0:
        raise ValueError("--strength must be between 0 and 1")
    graph, binary, chunks = read_glb(args.input.resolve())
    primitive = find_body_primitive(graph)
    position_index = primitive["attributes"]["POSITION"]
    normal_index = primitive["attributes"].get("NORMAL")
    index_index = primitive.get("indices")
    if index_index is None:
        raise ValueError("Body primitive must be indexed")
    positions_view = accessor_array(graph, binary, position_index, 3)
    indices = accessor_array(graph, binary, index_index, 1).reshape(-1).astype(np.int64)
    positions = np.asarray(positions_view, dtype=np.float64).copy()
    faces = indices.reshape(-1, 3)
    body = trimesh.Trimesh(vertices=positions, faces=faces, process=False)

    height = float(positions[:, 1].max() - positions[:, 1].min())
    cutoff = float(positions[:, 1].max() - height * args.head_ratio)
    source_head = largest_component_above(body, cutoff)
    tree = cKDTree(positions)
    distances, _body_indices = tree.query(source_head.vertices, k=1)
    if float(distances.max()) > 1e-6:
        raise ValueError("Could not map isolated head vertices back to the body accessor")

    target = aligned_target(source_head, args.target.resolve())
    fitted, report = fit_head(
        source_head, target, args.strength, args.max_displacement,
    )
    # glTF keeps UV-seam vertices separate even when their positions are identical, while
    # trimesh's connected-component extraction may merge those coordinates. Apply the averaged
    # fitted result to every matching accessor vertex so no duplicate is left behind as a crack.
    buckets: dict[tuple[int, int, int], list[np.ndarray]] = {}
    quantize = lambda vertex: tuple(np.rint(vertex * 10_000_000).astype(np.int64))
    for original, revised_position in zip(source_head.vertices, fitted):
        buckets.setdefault(quantize(original), []).append(revised_position)
    mapped = 0
    for body_index, original in enumerate(positions):
        candidates = buckets.get(quantize(original))
        if candidates:
            positions[body_index] = np.mean(candidates, axis=0)
            mapped += 1
    if mapped < len(source_head.vertices):
        raise ValueError("Head transfer left source vertices unmapped")
    positions_view[:] = positions.astype(np.float32)

    # Recompute the altered primitive's normals while keeping every other material and accessor
    # byte-for-byte. Normal maps can be added later; geometry normals must already be honest.
    if normal_index is not None:
        revised = trimesh.Trimesh(vertices=positions, faces=faces, process=False)
        normal_view = accessor_array(graph, binary, normal_index, 3)
        normal_view[:] = np.asarray(revised.vertex_normals, dtype=np.float32)

    accessor = graph["accessors"][position_index]
    accessor["min"] = positions.min(axis=0).tolist()
    accessor["max"] = positions.max(axis=0).tolist()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(replace_chunk(graph, binary, chunks))
    print(json.dumps({
        "input": str(args.input),
        "target": str(args.target),
        "output": str(args.output),
        "body_vertices": int(len(positions)),
        "head_vertices": int(len(source_head.vertices)),
        "strength": args.strength,
        **{key: round(value, 3) for key, value in report.items()},
        "bytes": args.output.stat().st_size,
    }, indent=2))


if __name__ == "__main__":
    main()
