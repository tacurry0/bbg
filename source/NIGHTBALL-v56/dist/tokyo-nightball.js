import { decodeTokyoDome } from './tokyo-model.js';
import { venueVision } from './venue-vision.js?v=74';

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
