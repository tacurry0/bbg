import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from '../dist/vendor/three.module.min.js';
import {DerbyStadiumShow} from '../dist/stadium-fx.js';
import {StadiumRenderer} from '../dist/stadium3d.js';
globalThis.window=globalThis;
for(const n of ['ratings-data','players','pro-parks','pennant','derby','game'])vm.runInThisContext(fs.readFileSync(new URL('../dist/'+n+'.js',import.meta.url),'utf8'));
const c=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>c})};
for(const id of ['tokyo-dome','river']){
 const park=NightPlayers.parks.find(p=>p.id===id);
 const r={scene:new T.Scene(),glowTexture:()=>new T.Texture()},show=new DerbyStadiumShow(r);
 const g={park,phase:'result',phaseTime:650,derby:{enhanced:true},field:{outcome:'hr',ball:{x:20,y:145},homerCelebration:{level:3,walkoff:true}}};
 g.teams={home:{color:'#e52f3d',accent:'#fff3d0'}};
 show.update(g);assert(show.group.visible&&show.jets.filter(j=>j.root.visible).length===9&&show.bursts.filter(b=>b.root.visible).length===3);
 for(const j of show.jets.filter(j=>j.root.visible)){const active=j.flame.filter(f=>f.visible);assert(active.length>=3);assert(active.some(f=>f.position.y>1));assert(active.every(f=>f.material.opacity>0&&f.material.opacity<=1));}
 const trail=show.jets[0].flame.map(f=>f.position.y);g.phaseTime=760;show.update(g);assert(show.jets[0].flame.some((f,i)=>f.visible&&f.position.y!==trail[i]));g.phaseTime=650;
 for(const b of show.bursts.filter(b=>b.root.visible)){assert(b.stars.count===72);assert(b.lines.visible&&b.cores.visible);assert(b.lines.geometry.attributes.position.array.some(n=>n!==0));}
 g.field.homerCelebration={level:1};show.update(g);assert.equal(show.jets.filter(j=>j.root.visible).length,3);assert.equal(show.bursts.filter(b=>b.root.visible).length,2);
 for(const [idx,kind,count] of [[2,'outfield',7],[3,'sweep',5],[4,'fan',5],[5,'vision',5],[6,'stands',5],[7,'field',5],[8,'sideline',5]]){
  g.derby.turnHR=idx;g.phaseTime=650;show.update(g);
  assert.equal(show.kind,kind);const lanes=show.jets.filter(j=>j.root.visible);assert.equal(lanes.length,count);
  assert(lanes.every(j=>j.flame.some(f=>f.visible)));assert(show.bursts.some(b=>b.root.visible&&b.lines.visible));
  const lay=show.layout(g);assert(lay.anchors.every(p=>Number.isFinite(p.x+p.y+p.z)));
  if(kind==='outfield')assert(new Set(lay.anchors.map(p=>p.color)).size===7);
  if(kind==='field')assert(lay.anchors.every(p=>Math.hypot(p.x,p.z)<NightPlayers.wallDistance(park,p.lane.angle)&&p.y<1));
  if(kind==='vision')assert(lay.anchors.every(p=>p.y>10));
 }
 g.derbyVictory={elapsed:700,champion:true};show.update(g);assert.equal(show.kind,'victory');assert.equal(show.jets.filter(j=>j.root.visible).length,11);assert.equal(show.bursts.filter(b=>b.root.visible).length,5);delete g.derbyVictory;
 g.phase='windup';show.update(g);assert(!show.group.visible);
}
const r=Object.create(StadiumRenderer.prototype);r.scene=new T.Scene();r.parkDecor=new T.Group();r.scene.add(r.parkDecor);r.gl={isSoftwareRenderer:true};r.canvas={dataset:{}};r.vfx={crowdUniforms:{}};
const chairs=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),4000);chairs.name='Blue stadium seats';const mat=new T.Matrix4();
for(let i=0;i<4000;i++){mat.makeTranslation((i%100)-50,3+Math.floor(i/100)*.6,90+Math.floor(i/100)*.7);chairs.setMatrixAt(i,mat);}r.parkDecor.add(chairs);
r.prepareSupporters(true);assert(Number(r.canvas.dataset.spectators)>1000);const g=new NightGame('derby','standard',()=>{},{park:'tokyo-dome',crowdAttendance:'empty',derby:{enhanced:true,mode:'record'}});r.updateSupporters(g);assert.equal(Number(r.canvas.dataset.spectators),r.supporterMeshes[0].list.length);
r.prepareSupporters(false);assert(Number(r.canvas.dataset.spectators)<1000);
console.log('PASS v268: time-varying turbulent gas plumes outdoors and indoors, full crowd batch rebuild and fallback');

// Decode the actual shipped Tokyo model, not only the hidden fallback stand.
const {decodeTokyoDome}=await import('../dist/tokyo-model.js');
const {tokyoDerbyCrowd}=await import('../dist/tokyo-nightball.js');
globalThis.Image=class {async decode(){}};
const raw=fs.readFileSync(new URL('../dist/assets/3d/tokyo-dome-real.glb',import.meta.url));
const model=await decodeTokyoDome(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const live=tokyoDerbyCrowd(r,model);assert(live.rows.length>20000);assert.equal(live.mesh.parent,model);assert.equal(live.mesh.count,live.rows.length);assert(live.rows.every(f=>Number.isFinite(f.y)&&f.y>2));
console.log('PASS actual Tokyo Dome GLB seat rows: '+live.rows.length+' visible audience instances');

