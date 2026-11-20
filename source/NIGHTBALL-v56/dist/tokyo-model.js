// Reader for the self-contained, static glTF 2.0 meshes shipped with this stadium.
import * as T from './vendor/three.module.min.js';

export async function decodeTokyoDome(buffer, anisotropy = 4) {
  const head = new DataView(buffer);
  if (head.getUint32(0, true) !== 0x46546c67 || head.getUint32(4, true) !== 2) {
    throw new Error('Expected a glTF 2 binary');
  }
  const jsonLength = head.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  const bin = 28 + jsonLength;
  const types = {5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array};
  const sizes = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};
  function attribute(id) {
    const a = gltf.accessors[id], view = gltf.bufferViews[a.bufferView], size = sizes[a.type];
    const array = new types[a.componentType](buffer, bin + (view.byteOffset || 0) + (a.byteOffset || 0), a.count * size);
    return new T.BufferAttribute(array, size, Boolean(a.normalized));
  }
  const linearSources = new Set(gltf.materials.filter(m => m.normalTexture).map(m => gltf.textures[m.normalTexture.index].source));
  const maps = await Promise.all(gltf.images.map(async (image, index) => {
    const view = gltf.bufferViews[image.bufferView];
    const src = URL.createObjectURL(new Blob([new Uint8Array(buffer, bin + (view.byteOffset || 0), view.byteLength)], {type: image.mimeType}));
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const texture = new T.Texture(img);
      texture.flipY = false;
      texture.colorSpace = linearSources.has(index) ? T.NoColorSpace : T.SRGBColorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = Math.min(8, anisotropy);
      texture.needsUpdate = true;
      return texture;
    } finally { URL.revokeObjectURL(src); }
  }));
  const texture = info => info ? maps[gltf.textures[info.index].source] : null;
  const materials = gltf.materials.map(m => {
    const p = m.pbrMetallicRoughness;
    return new T.MeshStandardMaterial({
      name: m.name, color: new T.Color().fromArray(p.baseColorFactor), map: texture(p.baseColorTexture),
      metalness: p.metallicFactor, roughness: p.roughnessFactor,
      emissive: new T.Color().fromArray(m.emissiveFactor || [0,0,0]), emissiveMap: texture(m.emissiveTexture),
      normalMap: texture(m.normalTexture), normalScale: new T.Vector2(m.normalTexture?.scale ?? 1, m.normalTexture?.scale ?? 1),
      side: m.doubleSided ? T.DoubleSide : T.FrontSide, alphaTest: m.alphaMode === 'MASK' ? m.alphaCutoff : 0
    });
  });
  const root = new T.Group();
  root.name = 'Tokyo Dome';
  for (const nodeId of gltf.scenes[gltf.scene].nodes) {
    const node = gltf.nodes[nodeId], group = new T.Group();
    group.name = node.name;
    for (const p of gltf.meshes[node.mesh].primitives) {
      const g = new T.BufferGeometry();
      const names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', COLOR_0: 'color' };
      for (const [name, id] of Object.entries(p.attributes)) g.setAttribute(names[name], attribute(id));
      g.setIndex(attribute(p.indices));
      const mat = materials[p.material];
      const actual = p.attributes.COLOR_0 === undefined ? mat : mat.clone();
      actual.vertexColors = p.attributes.COLOR_0 !== undefined;
      const mesh = new T.Mesh(g, actual);
      mesh.name = mat.name;
      mesh.receiveShadow = node.name === 'Field';
      group.add(mesh);
    }
    root.add(group);
  }
  return root;
}
