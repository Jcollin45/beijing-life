#!/usr/bin/env node
// Prove that a texture-only rebuild did not change the authored person.
// Image bytes and image dimensions are deliberately excluded; skinned geometry,
// UVs, weights, skeleton/bind pose, parts, and material behavior must match.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [beforeArg, afterArg] = process.argv.slice(2);
if (!beforeArg || !afterArg)
  throw new Error('usage: compare_rig_identity.js <before.glb> <after.glb>');

function parse(file) {
  const raw = fs.readFileSync(file);
  if (raw.readUInt32LE(0) !== 0x46546c67 || raw.readUInt32LE(4) !== 2)
    throw new Error(`${file}: not a glTF 2.0 GLB`);
  let offset = 12, gltf = null, bin = null;
  while (offset < raw.length) {
    const length = raw.readUInt32LE(offset), type = raw.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = raw.subarray(offset, offset + length);
    if (type === 0x4e4f534a) gltf = JSON.parse(chunk);
    if (type === 0x004e4942) bin = chunk;
    offset += length + (length % 4 ? 4 - length % 4 : 0);
  }
  if (!gltf || !bin) throw new Error(`${file}: missing JSON or BIN chunk`);
  return { gltf, bin };
}

const componentBytes = { 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 };
const typeWidth = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT2:4, MAT3:9, MAT4:16 };

function accessorFingerprint(model, index) {
  const accessor = model.gltf.accessors[index];
  const view = model.gltf.bufferViews[accessor.bufferView];
  const elementBytes = componentBytes[accessor.componentType] * typeWidth[accessor.type];
  const stride = view.byteStride || elementBytes;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const hash = crypto.createHash('sha256');
  for (let row = 0; row < accessor.count; row++)
    hash.update(model.bin.subarray(start + row * stride, start + row * stride + elementBytes));
  return {
    componentType: accessor.componentType,
    type: accessor.type,
    count: accessor.count,
    normalized: !!accessor.normalized,
    min: accessor.min || null,
    max: accessor.max || null,
    hash: hash.digest('hex'),
  };
}

function transform(node) {
  return {
    matrix: node.matrix || null,
    translation: node.translation || null,
    rotation: node.rotation || null,
    scale: node.scale || null,
  };
}

function identity(model) {
  const { gltf } = model;
  const parents = new Int32Array((gltf.nodes || []).length).fill(-1);
  (gltf.nodes || []).forEach((node, index) => {
    for (const child of node.children || []) parents[child] = index;
  });
  const nodeName = index => (gltf.nodes[index] && gltf.nodes[index].name) || `node-${index}`;
  const materials = (gltf.materials || []).map(material => ({
    name: material.name || '',
    alphaMode: material.alphaMode || 'OPAQUE',
    alphaCutoff: material.alphaCutoff === undefined ? null : material.alphaCutoff,
    doubleSided: !!material.doubleSided,
    baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
    metallicFactor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
    hasBaseColorTexture: material.pbrMetallicRoughness?.baseColorTexture !== undefined,
  }));
  const meshes = [];
  (gltf.nodes || []).forEach((node, nodeIndex) => {
    if (node.mesh === undefined || node.skin === undefined) return;
    const mesh = gltf.meshes[node.mesh];
    meshes.push({
      node: node.name || `node-${nodeIndex}`,
      transform: transform(node),
      skin: node.skin,
      primitives: mesh.primitives.map(primitive => ({
        mode: primitive.mode || 4,
        material: primitive.material === undefined ? null : materials[primitive.material],
        indices: primitive.indices === undefined ? null : accessorFingerprint(model, primitive.indices),
        attributes: Object.fromEntries(Object.entries(primitive.attributes || {}).sort()
          .map(([semantic, accessor]) => [semantic, accessorFingerprint(model, accessor)])),
      })),
    });
  });
  meshes.sort((a, b) => a.node.localeCompare(b.node));
  const skins = (gltf.skins || []).map(skin => ({
    name: skin.name || '',
    skeleton: skin.skeleton === undefined ? null : nodeName(skin.skeleton),
    joints: skin.joints.map(index => ({
      name: nodeName(index),
      parent: parents[index] < 0 ? null : nodeName(parents[index]),
      transform: transform(gltf.nodes[index]),
    })),
    inverseBindMatrices: accessorFingerprint(model, skin.inverseBindMatrices),
  }));
  return { meshes, skins };
}

const beforeFile = path.resolve(beforeArg), afterFile = path.resolve(afterArg);
const before = identity(parse(beforeFile)), after = identity(parse(afterFile));
const beforeText = JSON.stringify(before), afterText = JSON.stringify(after);
if (beforeText !== afterText) {
  console.error(`FAIL identity changed: ${path.basename(beforeFile)} -> ${path.basename(afterFile)}`);
  if (before.meshes.length !== after.meshes.length)
    console.error(`  skinned parts: ${before.meshes.length} -> ${after.meshes.length}`);
  if (before.skins.length !== after.skins.length)
    console.error(`  skins: ${before.skins.length} -> ${after.skins.length}`);
  process.exitCode = 1;
} else {
  const primitives = before.meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0);
  console.log(`PASS identity preserved · ${before.meshes.length} skinned parts · ${primitives} primitives · ` +
    `${before.skins.reduce((sum, skin) => sum + skin.joints.length, 0)} joints`);
}
