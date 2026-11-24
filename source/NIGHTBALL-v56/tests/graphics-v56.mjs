// Comprehensive verification of NIGHTBALL v56 3D graphics upgrades & scene invariants.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as T from '../dist/vendor/three.module.min.js';
import { StadiumRenderer } from '../dist/stadium3d.js';
import { decodeMatchModel } from '../dist/match-models.js';
import {
  createSkyMaterial,
  enhanceGrassMaterial,
  enhanceDirtMaterial,
  enhanceCrowdMaterial,
  StadiumVFX
} from '../dist/stadium-fx.js';

globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
const gradient = { addColorStop() {} };
const context = new Proxy(
  { createLinearGradient: () => gradient, createRadialGradient: () => gradient },
  { get: (o, k) => o[k] || (() => {}) }
);
const canvas = () => ({
  width: 0,
  height: 0,
  dataset: {},
  style: {},
  setAttribute() {},
  addEventListener() {},
  removeEventListener() {},
  getContext: type => (type === '2d' ? context : null),
  getBoundingClientRect: () => ({ width: 390, height: 640 }),
  parentElement: { appendChild() {} }
});
globalThis.document = { createElement: canvas };

for (const name of ['ratings-data', 'players', 'pro-parks', 'pennant', 'derby', 'game']) {
  vm.runInThisContext(readFileSync('dist/' + name + '.js', 'utf8'));
}

const origError = console.error;
let renderer;
try {
  console.error = () => {};
  renderer = new StadiumRenderer(canvas());
} finally {
  console.error = origError;
}

// 1. Software fallback compatibility & all parks/clubs construction
for (const park of NightPlayers.parks) renderer.setPark(park);
assert.equal(renderer.canvas.dataset.graphics, 'canvas-3d');
assert(renderer.batter.head.children.length > 12);
assert(renderer.batter.bat.children.length >= 6, 'Pro two-tone wood bat has barrel, tip, trademark ring, taper, grip, and knob');
assert(renderer.batter.elbowGuard, 'Batter has protective lead-arm elbow guard');
assert.equal(renderer.batter.cuffs.length, 2);
assert.equal(renderer.batter.socks.length, 2);
assert.equal(renderer.batter.eyes.length, 2);

for (const club of NightTeams.all) {
  const order = club.batters.slice(0, 9).map(p => p.id).reverse();
  for (const userHome of [true, false]) {
    const g = new NightGame('pennant', 'standard', () => {}, {
      homeTeamId: userHome ? club.id : 'foxes',
      awayTeamId: userHome ? 'foxes' : club.id,
      userHome,
      order,
      pitcher: 1
    });
    assert.deepEqual(g.lineups[g.userSide].map(p => p.id), order);
    g.beginHalf();
    if (!g.defending) { g.half = 'bottom'; g.beginHalf(); }
    assert.equal(g.pitcher.id, club.pitchers[1].id);
    renderer.render(g, 0);
  }
}
console.log('PASS 1: All parks, 6 clubs, upgraded player gear/two-tone bat, and software fallback render cleanly.');

// 2. Standing & live runners, player scales, and bunt pose
const standing = new NightGame('match', 'standard', () => {});
standing.half = 'bottom';
standing.setPhase('aim');
standing.bases = [true, false, true];
standing.baseIds = [standing.lineups.home[5].id, null, standing.lineups.home[7].id];
renderer.render(standing, 10);
assert.equal(renderer.runners.filter(p => p.root.visible).length, 2);
for (const p of [renderer.batter, renderer.pitcher, ...renderer.fielders, ...renderer.runners]) {
  assert.equal(p.root.scale.x, 2);
}
assert.equal(renderer.catcher.root.scale.x, 1.7);
standing.field = null;
standing.hit = null;
standing.setPhase('pitch');
standing.bunt = true;
renderer.render(standing, 30);
assert.equal(renderer.batter.bat.rotation.z, standing.batter.hand === 'L' ? Math.PI / 2 : -Math.PI / 2);
console.log('PASS 2: Runner visibility, actor scales (2.0 / catcher 1.7), and bunt override preserved.');

// 3. Plate alignment, Tokyo Dome unobstructed scoreboard & non-mirrored fence panels
const plateGame = new NightGame('match', 'standard', () => {}, {park:'school-district-east'});
plateGame.half = 'bottom';
plateGame.setPhase('aim');
renderer.render(plateGame, 0);
assert.deepEqual(renderer.camera.position.toArray(), [0.18, 3.6, 8.8]);
assert.equal(renderer.homePlate.scale.x, 2.2);
assert.equal(Math.abs(renderer.batter.root.position.x), 1.65);

// Verify fence distance signs are NOT horizontally mirrored (scale.x === 1)
const markers = renderer.wallGroup.children.filter(m => m.userData.parkMarker);
assert(markers.length >= 5, 'Outfield wall has distance markers');
for (const m of markers) {
  assert.equal(m.scale.x, 1, 'Fence distance marker must not mirror text backwards');
}

const outdoorTurf = renderer.grassMaterial.map, outdoorDirt = renderer.dirt.map;
const domePlate = new NightGame('practice', 'standard', () => {}, { park: 'tokyo-dome' });
domePlate.setPhase('aim');
renderer.render(domePlate, 0);
assert(renderer.scene.userData.broadcastDome);
assert.equal(renderer.canvas.dataset.parkModel, 'tokyo-dome');
assert(!renderer.board.visible, 'generic central board is replaced by the Tokyo Dome vision');
const vision=renderer.parkDecor.getObjectByName('Curved 125 m wide main vision');
assert.equal(vision.material.map,renderer.venueVisionCache.get('tokyo-dome').material.map);
assert(vision.geometry.index.count>12);
assert(renderer.parkDecor.getObjectByName('TOKYO DOME'));
renderer.scene.updateMatrixWorld(true);
for (const [targetY,targetZ] of [[17,-144],[21,-144],[25,-144]]) {
  const from = renderer.camera.position;
  const view = new T.Raycaster(from, new T.Vector3(0,targetY,targetZ).sub(from).normalize());
  const [closest] = view.intersectObjects(renderer.parkDecor.children,true);
  assert.equal(closest?.object,vision,'the entire center display stays visible from the plate');
}
assert(renderer.tokyoCutouts.every(mesh => mesh.visible));
assert(renderer.infieldSkin.every(mesh => !mesh.visible));
assert.notEqual(renderer.grassMaterial.map, outdoorTurf);
assert.notEqual(renderer.dirt.map, outdoorDirt);
for (const [parkId,model,names] of [
 ['dome','taoyuan',['Taoyuan left field vision','Taoyuan right field vision','Taoyuan rose outfield pavilions','Taoyuan sky blue infield stands']],
 ['taipei-dome','taipei-dome',['Taipei centralized main vision','Taipei Dome dark ceiling','Taipei gray and white upper seating']]
]) {
 const match=new NightGame('match','standard',()=>{},{park:parkId});
 renderer.render(match,0);
 assert.equal(renderer.canvas.dataset.parkModel,model);
 assert(!renderer.board.visible);
 for(const name of names)assert(renderer.parkDecor.getObjectByName(name),name);
 const display=renderer.parkDecor.getObjectByName('Live stadium vision');
 assert.equal(display.material,renderer.venueVisionCache.get(parkId).material);
 assert.equal(display.renderOrder,3,'Canvas places both vision triangles above the frame');
}
for (const [parkId,model,names] of [
 ['night','intercontinental',['Taichung left-center main vision','Taichung multi-level outfield complex','Taichung blue lower infield bowl']],
 ['brick','tianmu',['Tianmu low center scoreboard','Tianmu green mountain ridge','TAIPEI lettering behind home plate']],
 ['sky','tainan',['Tainan horseshoe canopy','Tainan upper deck beneath the steel roof','Tainan radial canopy trusses']],
 ['harbor','xinzhuang',['Xinzhuang scalloped infield canopy','Xinzhuang left-center main vision','Xinzhuang right-center auxiliary vision']],
 ['river','chengcing-lake',['Chengcing cantilevered infield wing roofs','Chengcing center-field two-panel vision','Chengcing blue seats behind home plate']],
 ['toyama','alpen-stadium',['Alpen grass outfield berms','Alpen 33-metre scoreboard cabinet','Alpen distant Tateyama ridgeline']]
]) {
 const match=new NightGame('match','standard',()=>{},{park:parkId});
 renderer.render(match,0);
 assert(renderer.overviewMode,'opening shot shows full stadium');
 assert(renderer.camera.position.y>20);
 assert.equal(renderer.canvas.dataset.parkModel,model);
 assert(!renderer.board.visible);
 for(const name of names)assert(renderer.parkDecor.getObjectByName(name),name);
 assert(renderer.parkDecor.getObjectByName('Infield protective net')?.isLineSegments);
 assert.equal(renderer.parkDecor.getObjectByName('Live stadium vision').material,renderer.venueVisionCache.get(parkId).material);
 match.setPhase('aim');renderer.render(match,16);
 assert(!renderer.overviewMode);
 assert.deepEqual(renderer.camera.position.toArray(),[.18,3.6,8.8]);
}

const pairedTowers={harbor:0,river:4,toyama:6};
for(const park of NightPlayers.parks.filter(p=>!p.school)){
 const {id}=park,indoor=park.theme==='dome';
 renderer.setPark(park,'day');
 for(const [material,color] of [[renderer.grassMaterial,park.turf],[renderer.dirt,park.clay],
  [renderer.materials.get(id+'wall'),park.wall],[renderer.materials.get(id+'rail'),park.rail],
  [renderer.materials.get(id+'warningTrack'),park.track],
  [renderer.parkDecor.getObjectByName('Curved foul-territory warning track').material,park.foulTrack]]){
  assert.equal(typeof color,'number',id+' defines a photo-based color');
  assert.equal(material.color.getHex(),color,id+' applies its color to the rendered surface');
 }
 assert.equal(renderer.scene.userData.turfNear.getHex(),park.turfNear??park.turf);
 assert.equal(renderer.mowing.opacity,.14*park.mowing[1]);
 assert(!renderer.lightsLit);
 if(id in pairedTowers){
  assert.equal(renderer.lights.filter(light=>light.userData.secondPole.visible).length,pairedTowers[id]);
 }
 renderer.setPark(park,'night');
 const nightColor=park.turfNight??new T.Color(park.turf).multiplyScalar(.86).getHex();
 assert.equal(renderer.grassMaterial.color.getHex(),nightColor);
 assert.equal(renderer.lightsLit,!indoor&&!park.roofProfile);
 if(!indoor)assert.equal(renderer.scene.userData.outdoorSky[0],'#060f24');
}
assert.equal(renderer.venueVisionCache.get('harbor:auxiliary').canvas.width,1140);

const proParks=NightPlayers.parks.filter(park=>park.pro);
assert.equal(proParks.filter(park=>park.league==='npb').length,13);
assert.equal(proParks.filter(park=>park.league==='kbo').length,9);
assert.equal(NightPlayers.proHomeParks['npb-g'],'tokyo-dome');
assert.equal(NightPlayers.proHomeParks['kbo-lg'],NightPlayers.proHomeParks['kbo-ob']);
const details={
 koshien:'Koshien Gin-san silver canopy',
 'es-con':'ES CON glass outfield facade',
 miyagi:'Miyagi Smile Glico Park Ferris wheel',
 'kyocera-dome':'Kyocera seven suspended Super Rings',
 'daejeon-hanwha':'Hanwha high right-field Monster Wall media glass',
 gocheok:'高尺スカイドーム steel truss grid'
};
for(const park of proParks){
 renderer.setPark(park,'day');
 assert.equal(renderer.canvas.dataset.parkModel,park.id);
 assert(renderer.parkDecor.getObjectByName(park.name+' main vision'));
 assert(renderer.parkDecor.getObjectByName('Infield protective net'));
 if(details[park.id])assert(renderer.parkDecor.getObjectByName(details[park.id]),details[park.id]);
 if(park.id==='koshien')assert(!renderer.infieldSkin[1].visible,'the grass diamond is hidden on black soil');
 if(park.roofProfile){
  const roof=renderer.parkDecor.getObjectByName(park.name+' roof shell');
  assert.equal(roof?.material.color.getHex(),park.roofProfile.color,'software 3D preserves the photo-based roof tint');
 }
 if(park.id==='daejeon-hanwha'){
  const positions=renderer.wallGroup.children[0].geometry.attributes.position.array;
  const heights=Array.from(positions).filter((v,i)=>i%3===1);
  assert.equal(Math.max(...heights),8);
  assert.equal(NightPlayers.fenceHeight(park,.6),8);
  assert.equal(NightPlayers.fenceHeight(park,-.6),2.4);
 }
}
for(const park of ['es-con','daejeon-hanwha']){
 const match=new NightGame('match','standard',()=>{},{park});
 renderer.render(match,0);
 assert.equal(renderer.canvas.dataset.cameraView,'overview');
 assert(renderer.venueVisionCache.get(park).material.map);
}
console.log('PASS: 22 modeled JP/KR venues, roofs, live boards, plate overviews and the Daejeon wall.');

for(const parkId of ['tokyo-dome','taipei-dome','dome']){
 const match=new NightGame('match','standard',()=>{},{park:parkId});
 const {park}=match,indoors=park.theme==='dome';
 window.nightSettings={gameLighting:'day'};
 renderer.render(match,0);
 assert.equal(renderer.canvas.dataset.cameraView,'overview');
 assert.equal(renderer.canvas.dataset.gameLighting,'day');
 assert(renderer.camera.position.y>20);
 assert(renderer.parkDecor.getObjectByName('Infield protective net'));
 assert(!renderer.lightsLit);
 if(renderer.sky)assert.equal(renderer.sky.visible,!indoors);
 const sceneParts=renderer.parkDecor.children.slice(),dayIntensity=renderer.skyLight.intensity;
 window.nightSettings.gameLighting='night';
 renderer.render(match,16);
 assert.equal(renderer.canvas.dataset.gameLighting,'night');
 assert(renderer.skyLight.intensity<dayIntensity);
 assert.equal(renderer.lightsLit,!indoors);
 assert.deepEqual(renderer.parkDecor.children,sceneParts,'time changes light without rebuilding venue meshes');
 if(indoors){
  assert(renderer.camera.position.y<NightPlayers.roofSurface(park,renderer.camera.position.x,-renderer.camera.position.z));
  assert(renderer.parkDecor.getObjectByName('Roof-edge LED lamps').material.emissiveIntensity>1);
 }else{
  if(renderer.sky)assert.equal(renderer.sky.material.uniforms.uNight.value,1);
  assert.equal(renderer.scene.userData.outdoorSky[0],'#060f24');
 }
 match.setPhase('aim');renderer.render(match,32);
 assert.equal(renderer.canvas.dataset.cameraView,'play');
 delete window.nightSettings;
}

renderer.render(plateGame, 0);
assert.equal(renderer.scene.fog.density, 0.0036);
assert(renderer.board.visible && renderer.infieldSkin.every(mesh => mesh.visible));
assert(renderer.lights.every(light=>light.userData.pole.visible&&!light.userData.secondPole.visible),
 'default stadium lights are restored after a park with custom towers');
assert(renderer.tokyoCutouts.every(mesh => !mesh.visible));
console.log('PASS 3: Non-mirrored fence distance panels, unobstructed Tokyo Dome scoreboard, and park surface swaps verified.');

// 4. Pitcher release hand accuracy at t=0 AND living idle/waggle animations at t>0
const throwing = new NightGame('match', 'standard', () => {});
throwing.pitchingStaff = { ...throwing.pitchingStaff, home: throwing.pitchingStaff.home.map(p => ({ ...p })) };
for (const hand of ['R', 'L']) {
  throwing.pitchingStaff.home[0].hand = hand;
  throwing.createPitch(NightGame.TYPES[1], { x: 0, y: 0 });
  throwing.setPhase('pitch');
  renderer.render(throwing, 0);
  renderer.scene.updateMatrixWorld(true);
  const arm = hand === 'L' ? 0 : 1;
  const pos = renderer.pitcher.hands[arm].position.clone();
  renderer.pitcher.hands[arm].getWorldPosition(pos);
  assert(Math.abs(pos.x - renderer.ball.position.x) < 1e-6);
  assert(Math.abs(pos.y - renderer.ball.position.y) < 1e-6);
  assert(Math.abs(-pos.z - renderer.ball.position.z) < 1e-6);
}

const poses = {};
for (const hand of ['R', 'L']) {
  const club = NightTeams.get('owls');
  const batter = club.batters.find(p => p.hand === hand);
  const g = new NightGame('derby', 'standard', () => {}, { practiceBatter: batter.id });
  g.setPhase('aim');
  renderer.render(g, 0);
  assert(Math.abs(renderer.batter.bat.rotation.z) < 0.20);
  poses[hand] = { x: renderer.batter.bat.position.x, tilt: renderer.batter.bat.rotation.z };
  // At t > 0 in aim phase, rhythmic bat-waggle animates the bat
  renderer.render(g, 420);
  assert(Math.abs(renderer.batter.bat.rotation.z - poses[hand].tilt) > 0.01, 'Bat waggle animates when time > 0');
}
assert.equal(poses.L.x, -poses.R.x);
assert.equal(poses.L.tilt, -poses.R.tilt);
console.log('PASS 4: Exact pitcher release hand at t=0, symmetric stance, and living bat-waggle at t>0 verified.');

// 5. GLB shadowSide fix & roof clearance
for (const name of ['jersey', 'intercontinental', 'tokyo-dome', 'broadcast-dome']) {
  const bytes = readFileSync('dist/assets/3d/' + name + '.glb');
  const model = decodeMatchModel(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert(model.children.length >= 2);
  for (const mesh of model.children) {
    assert.equal(mesh.material.shadowSide, T.FrontSide, 'GLB materials cast FrontSide shadows to prevent waist shadow acne');
  }
}
for (const park of ['tokyo-dome', 'taipei-dome']) {
  const dome = new NightGame('match', 'standard', () => {}, { park, userHome: false });
  dome.startField(50, 55, 0.65, false);
  renderer.camera.aspect = 0.61;
  renderer.lastTime = 0;
  for (let i = 1; i <= 900 && dome.phase === 'field'; i++) {
    dome.updateField(0.01);
    if (i % 4) continue;
    renderer.followPlay(dome, i * 10);
    renderer.lastTime = i * 10;
    const { x, y, z } = renderer.camera.position;
    assert(y <= NightPlayers.roofSurface(dome.park, x, -z) - 3.49);
  }
}
console.log('PASS 5: GLB FrontSide shadow fix and dome roof camera clearance verified.');

// 6. WebGL shader hooks & StadiumVFX simulation (3D ball ribbon, swing arc, sparks, dust, HR fireworks)
const skyMat = createSkyMaterial();
assert(skyMat.uniforms.uNight && skyMat.uniforms.uRural && skyMat.uniforms.uTime);
const mockGl = { isSoftwareRenderer: false };
const grassMat = new T.MeshStandardMaterial();
const grassUniforms = enhanceGrassMaterial(grassMat, mockGl);
assert(grassUniforms.uFenceAnchors && typeof grassMat.onBeforeCompile === 'function');
assert.equal(grassUniforms.uPhotoTurf.value,0);
const grassShader={uniforms:{},vertexShader:'#include <common>\n#include <project_vertex>',
 fragmentShader:'#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <tonemapping_fragment>'};
grassMat.onBeforeCompile(grassShader);
assert(grassShader.fragmentShader.includes('turfCol * brightness'));
assert(grassShader.fragmentShader.indexOf('#include <tonemapping_fragment>')<grassShader.fragmentShader.indexOf('turfCol * brightness'));
const dirtMat = new T.MeshStandardMaterial();
enhanceDirtMaterial(dirtMat, mockGl);
assert(typeof dirtMat.onBeforeCompile === 'function');
const crowdMat = new T.MeshStandardMaterial();
const mockScene = new T.Scene();
mockScene.scale.z = -1;
const vfx = new StadiumVFX({ gl: mockGl, scene: mockScene, camera: renderer.camera, sky: { material: skyMat }, batter: renderer.batter });
enhanceCrowdMaterial(crowdMat, mockGl, vfx.crowdUniforms);
assert(typeof crowdMat.onBeforeCompile === 'function');

// Simulate pitch ribbon, swing arc, contact flash, and outdoor HR fireworks
const vfxGame = new NightGame('match', 'standard', () => {}, { park: 'harbor', userHome: true });
vfxGame.half = 'bottom';
vfxGame.power = true;
vfxGame.createPitch(NightGame.TYPES[0], { x: 0, y: 0 });
vfxGame.setPhase('pitch');
vfxGame.pitch.progress = 0.75;
vfxGame.swingAge = 90;
vfx.update(vfxGame, 1000, false);
assert.equal(vfx.ribbon.visible, true, '3D ball ribbon visible on incoming pitch');
assert.equal(vfx.swingArc.visible, true, '3D bat-swing arc visible during swing');

vfxGame.startField(51, 30, 0.05, false, true);
vfx.update(vfxGame, 1050, true);
assert(vfx.shockRing.visible, 'Contact shockwave ring triggers on clean hit');
assert(vfx.sparkMesh.count > 0, 'Contact sparks emitted');
for (let i = 0; i < 340; i++) {
  if (vfxGame.phase === 'field') vfxGame.updateField(0.016);
  vfx.update(vfxGame, 1100 + i * 16, vfxGame.phase === 'field');
}
assert.equal(vfxGame.hit.kind, 'hr', 'Ball cleared the fence for a Home Run');
assert(vfx.crowdUniforms.uCrowdExcite.value > 0.5, 'Crowd excitement rises on Home Run');
console.log('PASS 6: WebGL shader hooks and 3D StadiumVFX (ribbon, swing arc, shockwave, sparks, crowd excitement) verified.');

// The line-of-sight overlay must vary as well as the underlying 3D ball.
renderer.camera.position.set(0,10,20);
renderer.camera.lookAt(0,7,-25);
renderer.camera.updateMatrixWorld();
const oldHud=renderer.hud,oldContext=renderer.ctx;
let paintedRadius=0;
renderer.hud={width:renderer.width};
renderer.ctx={setTransform(){},clearRect(){},beginPath(){},arc(x,y,r){paintedRadius=r;},stroke(){},fill(){}};
renderer.fieldMode=true;
renderer.overviewMode=false;
const drawFieldBall=(y,z)=>{
  paintedRadius=0;
  renderer.drawHUD({replayView:true,field:{ball:{x:0,y,z}}});
  assert(paintedRadius>0,'ball marker is visible');
  return paintedRadius;
};
const nearBall=drawFieldBall(20,1),highBall=drawFieldBall(20,23),farBall=drawFieldBall(70,1);
assert(nearBall>highBall*1.3,'same-depth fly ball shrinks visibly as it rises');
assert(nearBall>farBall*1.25,'ground-level ball shrinks at a greater camera distance');
assert.equal(drawFieldBall(20,1),nearBall,'ball grows again on descent');
renderer.hud=oldHud;renderer.ctx=oldContext;

// 7. Service Worker latest asset manifest integrity check
const swCode = readFileSync('dist/sw.js', 'utf8');
assert(swCode.includes('nightball-v139-draft'));
assert(swCode.includes('./stadium-premium.js?v=57'));
assert(swCode.includes('./menu-polish.css?v=58'));

assert(swCode.includes('./stadium-fx.js?v=74'));
assert(swCode.includes('./venue-vision.js?v=74'));
assert(swCode.includes('./open-air-parks.js?v=74'));
assert(!swCode.includes('assets/stadiums/'));
const filesMatch = swCode.match(/const FILES=\[([^\]]+)\]/);
assert(filesMatch);
const swFiles = JSON.parse('[' + filesMatch[1].replace(/'/g, '"') + ']');
for (const entry of swFiles) {
  if (entry === './') continue;
  const clean = entry.split('?')[0].replace(/^\.\//, '');
  assert(existsSync('dist/' + clean), 'Missing SW cached file: dist/' + clean);
}
console.log('PASS 7: Service Worker current cache manifest verified (' + swFiles.length + ' offline-ready assets).');
