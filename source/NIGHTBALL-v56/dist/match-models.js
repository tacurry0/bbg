import * as T from './vendor/three.module.min.js';

// The three first-party Blender exports use static meshes with packed accessors.
// Keeping this subset local avoids adding a second copy of Three.js or runtime fetches to a CDN.
const models=new Map();
export function loadMatchModel(name){
 if(!models.has(name)){
  const url=new URL('./assets/3d/'+name+'.glb',import.meta.url);
  const promise=fetch(url).then(response=>{
   if(!response.ok)throw new Error('Model unavailable: '+name);
   return response.arrayBuffer();
  }).then(decodeMatchModel).catch(()=>{models.delete(name);return null;});
  models.set(name,promise);
 }
 return models.get(name);
}

export function decodeMatchModel(buffer){
 const header=new DataView(buffer);
 if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2)throw new Error('Invalid GLB');
 const jsonLength=header.getUint32(12,true),offset=28+jsonLength;
 const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
 const attribute=id=>{
  const acc=gltf.accessors[id],view=gltf.bufferViews[acc.bufferView];
  const type={5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[acc.componentType];
  const size=acc.type==='VEC3'?3:1;
  const start=offset+(view.byteOffset||0)+(acc.byteOffset||0);
  return new T.BufferAttribute(new type(buffer,start,acc.count*size),size);
 };
 const group=new T.Group();
 for(const index of gltf.scenes[gltf.scene].nodes){
  const node=gltf.nodes[index];
  for(const part of gltf.meshes[node.mesh].primitives){
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',attribute(part.attributes.POSITION));
   geometry.setAttribute('normal',attribute(part.attributes.NORMAL));
   geometry.setIndex(attribute(part.indices));
   const appearance=gltf.materials[part.material],pbr=appearance.pbrMetallicRoughness;
   const material=new T.MeshStandardMaterial({
    color:new T.Color().fromArray(pbr.baseColorFactor),
    roughness:pbr.roughnessFactor??1,metalness:pbr.metallicFactor??0,
    side:T.DoubleSide,shadowSide:T.FrontSide
   });
   const mesh=new T.Mesh(geometry,material);
   mesh.name=appearance.name;
   group.add(mesh);
  }
 }
 return group;
}
