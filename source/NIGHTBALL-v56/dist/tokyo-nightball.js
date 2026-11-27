import { decodeTokyoDome } from './tokyo-model.js';
import * as T from './vendor/three.module.min.js';
import { venueVision } from './venue-vision.js?v=263';

// Instances are per renderer. A title-screen preview and a live game can coexist.
const instances = new WeakMap();
let asset;
// Loading progress (v169, checker item loading-progress-display): the app
// shell listens for 'nightball-loading' events and shows the shared loading
// overlay, so this ~9 MB on-demand download no longer looks like a freeze.
function reportLoading(detail){
  try{window.dispatchEvent(new CustomEvent('nightball-loading',{detail:{source:'tokyo-dome',...detail}}));}catch{}
}
async function readAsset(){
  if (!asset) {
    asset = (async () => {
      reportLoading({phase:'start',label:'東京ドームを読み込んでいます',fraction:null});
      const response = await fetch(new URL('./assets/3d/tokyo-dome-real.glb', import.meta.url));
      if (!response.ok) throw new Error('Tokyo Dome GLB: HTTP ' + response.status);
      const total = Number(response.headers.get('Content-Length')) || 0;
      if (!response.body || typeof response.body.getReader !== 'function') {
        const buffer = await response.arrayBuffer();
        reportLoading({phase:'decode',label:'球場を準備しています',fraction:null});
        return buffer;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        reportLoading({phase:'progress',label:'東京ドームを読み込んでいます',fraction:total ? loaded / total : null});
      }
      reportLoading({phase:'decode',label:'球場を準備しています',fraction:null});
      const buffer = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
      return buffer.buffer;
    })().catch(error => { asset = null; reportLoading({phase:'error'}); throw error; });
  }
  return asset;
}

export function rememberOriginalGround(renderer, meshes) {
  instances.set(renderer, {ground: meshes, hidden: new Map(), model: null, pending: null, serial: 0});
}

export function leaveTokyoDome(renderer) {
  const state = instances.get(renderer);
  if (!state) return;
  state.serial++;
  delete renderer.canvas.dataset.spectatorModel;
  if (state.model) state.model.visible = false;
  for (const [mesh, visible] of state.hidden) mesh.visible = visible;
  state.hidden.clear();
}

function attachScoreboard(renderer, model) {
  const board = venueVision(renderer, 'tokyo-dome').material;
  const ranges = {'Left LED wing': [0, .387], 'Live scoreboard': [.387, .613], 'Right LED wing': [.613, 1]};
  model.getObjectByName('Vision').traverse(mesh => {
    const range = mesh.isMesh && ranges[mesh.name];
    if (!range) return;
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, range[0] + (range[1]-range[0])*uv.getX(i), 1-uv.getY(i));
    }
    uv.needsUpdate = true;
    mesh.material = board;
  });
}

export async function showTokyoDome(renderer) {
  const state = instances.get(renderer);
  if (!state || renderer.gl.isSoftwareRenderer || renderer.parkKey !== 'tokyo-dome') return;
  const serial = state.serial;
  try {
    if (!state.pending) {
      state.pending = readAsset()
        .then(buffer => decodeTokyoDome(buffer, renderer.gl.capabilities.getMaxAnisotropy()))
        .then(model => {
          // NIGHTBALL mirrors its scene Z axis; centre field is +Z in its local frame.
          model.scale.z = -1;
          attachScoreboard(renderer, model);
          model.visible = false;
          renderer.scene.add(model);
          state.model = model;
          return model;
        }).catch(error => { state.pending = null; throw error; });
    }
    const model = await state.pending;
    if (state.serial !== serial || renderer.parkKey !== 'tokyo-dome') return;
    for (const mesh of [...state.ground, renderer.parkDecor, renderer.wallGroup]) {
      if (!state.hidden.has(mesh)) state.hidden.set(mesh, mesh.visible);
      mesh.visible = false;
    }
    model.visible = true;
    reportLoading({phase:'done'});
    renderer.canvas.dataset.parkModel = 'tokyo-dome-real';
    renderer.boardKey = null;
    renderer.heroRendered = false;
    renderer.scene.userData.staticRevision = (renderer.scene.userData.staticRevision || 0) + 1;
  } catch (error) {
    reportLoading({phase:'done'});
    console.warn('Tokyo Dome: using the built-in ballpark.', error);
  }
}

export function domeCameraLimit(renderer, position, defaultLimit) {
  const state = instances.get(renderer);
  if (!state?.model?.visible) return defaultLimit;
  const d = (-position.z - 51) / 112;
  const r2 = (position.x / 118) ** 2 + d ** 2;
  // Lower envelope of the quilted roof. Leave clearance for suspended equipment.
  const membrane = 35.7 - 3 * d + 24.93 * Math.max(0, 1 - r2);
  return Math.min(defaultLimit, membrane - 4);
}

// The real Tokyo model replaces (hides) the procedural park completely.
// Its seat-pan quads describe full rows, not individual chairs: subdivide
// each actual row and attach the fans to the displayed GLB itself.
export function tokyoDerbyCrowd(renderer,model){
  const rows=[],v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),d=new T.Vector3(),left=new T.Vector3(),right=new T.Vector3();
  model.getObjectByName('Stands')?.traverse(mesh=>{
    if(!mesh.isMesh||!/seat pans/i.test(mesh.name))return;
    const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
    if(!p||!idx)return;
    for(let i=0;i+5<idx.count;i+=6){
      a.fromBufferAttribute(p,idx.getX(i));b.fromBufferAttribute(p,idx.getX(i+1));
      c.fromBufferAttribute(p,idx.getX(i+2));d.fromBufferAttribute(p,idx.getX(i+5));
      left.copy(a).add(d).multiplyScalar(.5);right.copy(b).add(c).multiplyScalar(.5);
      const width=left.distanceTo(right),count=Math.max(1,Math.round(width/.80));
      for(let n=0;n<count;n++){
        v.copy(left).lerp(right,(n+.5)/count);
        rows.push({x:v.x,y:v.y,z:v.z,width:width/count,seed:((Math.imul(rows.length+193,2654435761)>>>0)%100003)/100003});
      }
    }
  });
  if(!rows.length)return null;
  const geometry=renderer.supporterGeometry(false),material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:T.DoubleSide});
  const mesh=new T.InstancedMesh(geometry,material,rows.length);mesh.name='Tokyo Dome full derby audience';mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;model.add(mesh);
  const dummy=new T.Object3D();
  for(let i=0;i<rows.length;i++){
    const f=rows[i],yaw=Math.atan2(-f.x,-51-f.z);dummy.position.set(f.x+Math.sin(yaw)*.06,f.y+.04,f.z+Math.cos(yaw)*.06);dummy.rotation.set(0,yaw,0);
    dummy.scale.set(Math.min(2.1,Math.max(1.18,f.width/.48)),.85+f.seed*.23,.90);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  return {mesh,rows,key:null};
}
export function updateTokyoDerbyCrowd(renderer,g){
  const state=instances.get(renderer);
  if(!state?.model?.visible||renderer.parkKey!=='tokyo-dome')return;
  if(!g?.derby){if(state.derbyCrowd)state.derbyCrowd.mesh.visible=false;delete renderer.canvas.dataset.spectatorModel;return;}
  state.derbyCrowd||=tokyoDerbyCrowd(renderer,state.model);const crowd=state.derbyCrowd;if(!crowd)return;
  crowd.mesh.visible=true;renderer.canvas.dataset.spectators=String(crowd.rows.length);
  renderer.canvas.dataset.spectatorModel='tokyo-dome-real';
  const home=g.teams.home,away=g.teams.away,key=home.id+'/'+away.id;
  if(crowd.key===key)return;crowd.key=key;
  const colors=[0xf6df9c,0xe9e8df,0xe18c58,0x3f485c,0xa1cce4,0xc1a7d2],col=new T.Color(),hc=new T.Color(home.color||0xffd349),ac=new T.Color(away.color||0x79b5dc);
  crowd.rows.forEach((f,i)=>{
    col.setHex(colors[Math.floor(f.seed*colors.length)]);
    if(f.seed<.48)col.lerp(hc,.76);else if(f.seed>.70)col.lerp(ac,.55);
    crowd.mesh.setColorAt(i,col);
  });crowd.mesh.instanceColor.needsUpdate=true;
}
