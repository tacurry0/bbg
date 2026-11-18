// Exercise the real scene constructor: syntax checks cannot catch missing logo variables.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { StadiumRenderer } from '../dist/stadium3d.js';
import { decodeMatchModel } from '../dist/match-models.js';
globalThis.window=globalThis;globalThis.devicePixelRatio=1;
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
const canvas=()=>({width:0,height:0,dataset:{},style:{},setAttribute(){},addEventListener(){},removeEventListener(){},getContext:type=>type==='2d'?context:null,getBoundingClientRect:()=>({width:390,height:640}),parentElement:{appendChild(){}}});
globalThis.document={createElement:canvas};
for(const name of ['ratings-data','players','pennant','derby','game'])vm.runInThisContext(readFileSync('dist/'+name+'.js','utf8'));
const error=console.error;let renderer;
try{console.error=()=>{};renderer=new StadiumRenderer(canvas());}finally{console.error=error;}
for(const park of NightPlayers.parks)renderer.setPark(park);assert.equal(renderer.canvas.dataset.graphics,'canvas-3d');assert(renderer.batter.head.children.length>10);
for(const club of NightTeams.all){const order=club.batters.slice(0,9).map(p=>p.id).reverse();
 for(const userHome of [true,false]){const g=new NightGame('pennant','standard',()=>{},{homeTeamId:userHome?club.id:'foxes',awayTeamId:userHome?'foxes':club.id,userHome,order,pitcher:1});assert.deepEqual(g.lineups[g.userSide].map(p=>p.id),order);g.beginHalf();if(!g.defending){g.half='bottom';g.beginHalf();}assert.equal(g.pitcher.id,club.pitchers[1].id);renderer.render(g,0);}
 for(const p of club.batters){const g=new NightGame('derby','standard',()=>{},{homeTeamId:club.id,practiceBatter:p.id});assert.equal(g.batter.id,p.id);assert.equal(g.batter.power,p.power);}
}
console.log('PASS: 3D scene/player/logo construction and six-club rendering; selected order and starter on both sides; all 96 derby batters.');

// Standing runners survive the switch back from the ball camera to batting.
const standing=new NightGame('match','standard',()=>{});standing.half='bottom';standing.setPhase('aim');standing.bases=[true,false,true];standing.baseIds=[standing.lineups.home[5].id,null,standing.lineups.home[7].id];renderer.render(standing,10);
assert.equal(renderer.runners.filter(p=>p.root.visible).length,2);
for(const i of [0,2]){assert.equal(renderer.runners[i].root.position.x,NightGame.BASES[i+1].x);assert.equal(renderer.runners[i].root.position.z,NightGame.BASES[i+1].y);assert(renderer.runners[i].styleKey.includes('/'+standing.lineups.home[i===0?5:7].no+'/'));}
standing.startField(25,10,0,false);renderer.render(standing,20);for(let i=0;i<standing.field.runners.length;i++){const r=standing.field.runners[i],profile=standing.lineups.home.find(p=>p.id===r.id);assert(renderer.runners[i].styleKey.includes('/'+profile.no+'/'));}
console.log('PASS: occupied bases remain visible between pitches; standing and live runners wear their own numbers.');

// Every actor shares the same size increase, including live fielders and runners.
for(const p of [renderer.batter,renderer.pitcher,...renderer.fielders,...renderer.runners])assert.equal(p.root.scale.x,2);
assert.equal(renderer.catcher.root.scale.x,1.7);
standing.field=null;standing.hit=null;standing.setPhase('pitch');standing.bunt=true;renderer.render(standing,30);
assert.equal(renderer.batter.bat.rotation.z,standing.batter.hand==='L'?Math.PI/2:-Math.PI/2);
console.log('PASS: all players doubled; catcher keeps its crouch proportion; bunt bat pose.');

// Check the plate alignment and the wider portrait transition after contact.
const plateGame=new NightGame('match','standard',()=>{});plateGame.half='bottom';plateGame.setPhase('aim');renderer.render(plateGame,0);
assert.deepEqual(renderer.camera.position.toArray(),[.18,3.6,8.8]);assert.equal(renderer.homePlate.scale.x,2.2);assert.equal(Math.abs(renderer.batter.root.position.x),1.65);
const outdoorTurf=renderer.grassMaterial.map,outdoorDirt=renderer.dirt.map;
const domePlate=new NightGame('practice','standard',()=>{},{park:'tokyo-dome'});
domePlate.setPhase('aim');renderer.render(domePlate,0);
assert(renderer.scene.userData.broadcastDome);
assert.deepEqual(renderer.camera.position.toArray(),[.18,3.6,8.8]);
assert.equal(Math.abs(renderer.batter.root.position.x),1.65);
assert.equal(renderer.batter.root.scale.x,2);
assert(renderer.parkDecor.children.some(o=>o.userData.roof));
assert(renderer.parkDecor.getObjectByName('broadcast-terraces').visible);
assert.notEqual(renderer.grassMaterial.map,outdoorTurf);
assert.notEqual(renderer.dirt.map,outdoorDirt);
const aim=renderer.aimPoint(.85,.85),roundTrip=renderer.screenToAim(aim.x,aim.y);
assert(aim.x>0&&aim.x<renderer.width&&aim.y>0&&aim.y<renderer.height);
assert(Math.abs(roundTrip.x-.85)<1e-6&&Math.abs(roundTrip.y-.85)<1e-6);
renderer.render(plateGame,0);
assert.equal(renderer.scene.userData.broadcastDome,false);
assert.equal(renderer.grassMaterial.map,outdoorTurf);
assert.equal(renderer.dirt.map,outdoorDirt);
assert.equal(renderer.scene.fog.density,.0036);
plateGame.startField(36,20,.3,false);renderer.render(plateGame,1);assert(renderer.camera.position.y>=34&&renderer.camera.position.y<=37);assert(renderer.camera.fov>=56);assert.equal(renderer.batter.root.scale.x,2);
console.log('PASS: wider plate camera, wider batting stance, enlarged home plate, higher and wider contact camera, original actor scale.');

// Left-handed starters and relievers mirror arm/leg motion, not the whole uniform.
const throwing=new NightGame('match','standard',()=>{});
throwing.pitchingStaff={...throwing.pitchingStaff,home:throwing.pitchingStaff.home.map(p=>({...p}))};
const snapshots={};
for(const hand of ['R','L','R']){
 throwing.pitchingStaff.home[0].hand=hand;throwing.createPitch(NightGame.TYPES[1],{x:0,y:0});
 throwing.phaseTime=350;renderer.render(throwing,0);
 const arm=hand==='L'?0:1,glove=1-arm;
 assert.equal(renderer.pitcher.glove.parent,renderer.pitcher.hands[glove]);
 assert(renderer.pitcher.hands[arm].position.y>renderer.pitcher.hands[glove].position.y);
 assert(renderer.pitcher.feet[glove].position.y>renderer.pitcher.feet[arm].position.y);
 assert.equal(renderer.pitcher.root.scale.x,2);
 throwing.setPhase('pitch');renderer.render(throwing,0);
 renderer.scene.updateMatrixWorld(true);const pos=renderer.pitcher.hands[arm].position.clone();renderer.pitcher.hands[arm].getWorldPosition(pos);
 // Model coordinates before the scene's Z reflection match the release position.
 assert(Math.abs(pos.x-renderer.ball.position.x)<1e-6);assert(Math.abs(pos.y-renderer.ball.position.y)<1e-6);assert(Math.abs(-pos.z-renderer.ball.position.z)<1e-6);
 assert(Math.abs(throwing.pitchAt(1).x)<1e-9);assert(Math.abs(throwing.pitchAt(1).y)<1e-9);
 snapshots[hand]={start:throwing.pitchAt(0).x,mid:throwing.pitchAt(.6).x,break:throwing.pitch.bx};
 delete throwing.pitch.releaseX;delete throwing.pitch.throwHand;assert(Math.sign(throwing.pitchAt(0).x)===(hand==='L'?1:-1));
}
assert.equal(snapshots.L.start,-snapshots.R.start);assert.equal(snapshots.L.mid,-snapshots.R.mid);assert.equal(snapshots.L.break,-snapshots.R.break);
// Use an actual roster reliever and the real substitution command.
throwing.pitch=null;throwing.setPhase('aim');const leftIndex=throwing.pitchingStaff.home.findIndex((p,i)=>i>0&&p.hand==='L');assert(leftIndex>0);assert(throwing.changePitcher(leftIndex));renderer.render(throwing,0);assert.equal(renderer.pitcher.throwHand,'L');assert.equal(renderer.pitcher.glove.parent,renderer.pitcher.hands[1]);
console.log('PASS: mirrored left/right throwing arm, glove, lead leg, hand-to-ball release, pitch movement, plate target, legacy saves and left-handed relief.');
// Both batting sides hold a visible, more upright bat without mirroring the text.
const poses={};
for(const hand of ['R','L']){
 const club=NightTeams.get('owls'),batter=club.batters.find(p=>p.hand===hand),g=new NightGame('derby','standard',()=>{},{practiceBatter:batter.id});g.setPhase('aim');renderer.render(g,0);
 assert.equal(renderer.batter.bat.visible,true);assert.equal(renderer.batter.root.scale.x,2);assert(Math.abs(renderer.batter.bat.rotation.z)<.20);
 const side=hand==='L'?-1:1;assert.equal(Math.sign(renderer.batter.bat.position.x),side);assert.equal(Math.sign(renderer.batter.hands[0].position.x),side);assert.equal(Math.sign(renderer.batter.hands[1].position.x),side);
 renderer.scene.updateMatrixWorld(true);const tip=renderer.batter.bat.localToWorld(renderer.batter.bat.position.clone().set(0,1,0)),screen=renderer.project(tip.x,tip.y,-tip.z);assert(screen.x>0&&screen.x<renderer.width);assert(screen.y>0&&screen.y<renderer.height);poses[hand]={x:renderer.batter.bat.position.x,tilt:renderer.batter.bat.rotation.z};
 g.swingAge=100;renderer.render(g,100);assert.equal(Math.sign(renderer.batter.body.rotation.y),-side);
}
assert.equal(poses.L.x,-poses.R.x);assert.equal(poses.L.tilt,-poses.R.tilt);
console.log('PASS: upright bat, inward hand grips and visible bat tip on both batting sides; mirrored swing, readable uniform.');

for(const name of ['jersey','intercontinental','tokyo-dome','broadcast-dome']){
 const bytes=readFileSync('dist/assets/3d/'+name+'.glb');
 const model=decodeMatchModel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert(model.children.length>=2);
 for(const mesh of model.children){
  assert(mesh.geometry.attributes.position.count>0);
  assert.equal(mesh.geometry.attributes.position.count,mesh.geometry.attributes.normal.count);
  assert.equal(mesh.geometry.index.count%3,0);
 }
}
for(const park of NightPlayers.parks){
 const marks=[park.left,park.leftCenter,park.center,park.rightCenter,park.right];
 for(let i=0;i<marks.length;i++){
  const a=(i-2)*Math.PI/8;
  assert(Math.abs(NightPlayers.wallDistance(park,a)-marks[i])<1e-8);
  if(i===0||i===4)continue;
  const e=1e-5,center=NightPlayers.wallDistance(park,a);
  const before=(center-NightPlayers.wallDistance(park,a-e))/e,after=(NightPlayers.wallDistance(park,a+e)-center)/e;
  assert(Math.abs(before-after)<.02);
 }
}
console.log('PASS: Blender GLBs import, fence passes original distance marks and has continuous slope.');
const double=new NightGame('match','standard',()=>{},{park:'night',userHome:false});
double.setPhase('aim');
renderer.render(double,0);
double.startField(37,15,.42,false);
let returning=false,inFrame=0,played=0;
for(let i=1;i<=1000&&double.phase==='field';i++){
 double.updateField(.01);
 if(i%5)continue;
 renderer.followPlay(double,i*10);
 renderer.lastTime=i*10;renderer.camera.updateMatrixWorld(true);
 const ball=double.field.ball,p=renderer.project(ball.x,ball.z,ball.y);
 if(p.x>=0&&p.x<=renderer.width&&p.y>=0&&p.y<=renderer.height)inFrame++;
 played++;
 returning||=!!double.field.throw;
}
assert(returning);
assert.equal(double.field.outcome,'double');
assert.equal(double.field.runners[0].base,2);
assert(inFrame/played>.97);
console.log('PASS: right-center double, return throw and runner on second; the ball remains visible through contact and return.');

// The camera must not interpolate through the dome even on the highest contacts.
for(const park of ['tokyo-dome','taipei-dome'])for(const aspect of [.61,1.9])for(const mode of ['match','derby']){
 const dome=new NightGame(mode,'standard',()=>{},{park,userHome:false});
 dome.startField(50,55,.65,false);
 renderer.camera.aspect=aspect;
 renderer.lastTime=0;
 for(let i=1;i<=1100&&dome.phase==='field';i++){
  dome.updateField(.01);
  if(i%3)continue;
  renderer.followPlay(dome,i*10);renderer.lastTime=i*10;
  const {x,y,z}=renderer.camera.position;
  assert(y<=NightPlayers.roofSurface(dome.park,x,-z)-3.49);
 }
}
for(const park of NightPlayers.parks.filter(p=>p.school)){
 const positions=NightGame.positions(park);
 for(const [,x,y] of positions.slice(6))assert(Math.hypot(x,y)<NightPlayers.wallDistance(park,Math.atan2(x,y)));
 for(const side of [-1,1])assert.equal(NightPlayers.wallDistance(park,side*Math.PI/4),park.corner);
}
assert.equal(NightPlayers.parks.filter(p=>p.school&&p.corner===70).length,2);
assert.equal(NightPlayers.parks.filter(p=>p.school&&p.corner===85).length,2);
const {PlayReview,CHALLENGES,challengeWon,hitReadout}=await import('../dist/play-review.js');
const review=new PlayReview(),practice=new NightGame('practice','standard',()=>{});
practice.startField(37,15,.42,false);review.capture(practice);
for(let i=0;i<1000&&!practice.field.resolved;i++){practice.update(16);review.capture(practice);}
assert.equal(review.capture(practice,true),null);assert.equal(review.open(practice),false);
const scoring=new NightGame('match','standard',()=>{},{park:'school-field-east',userHome:false});
scoring.startField(54,28,.42,false);review.capture(scoring);
for(let i=0;i<1000&&!scoring.field.resolved;i++){scoring.update(16);review.capture(scoring);}
assert(scoring.homeScore+scoring.awayScore>0);
assert(review.capture(scoring,true));assert(review.open(scoring,'infield'));
assert.equal(review.frame(200).game.replayView,'infield');assert(scoring.paused);
const at=scoring.field.elapsed;review.close();assert(!scoring.paused);assert.equal(scoring.field.elapsed,at);
assert.match(hitReadout(practice.hit),/133 km\/h · 15° · 右中間/);
for(const [id,situation] of Object.entries(CHALLENGES)){
 const g=new NightGame('practice','standard',()=>{},{park:situation.park});
 g.challenge=id;g.defense=situation.defense||'normal';g.manualRunning=id==='tag';g.outs=situation.outs;
 g.bases[situation.base-1]=true;g.baseIds[situation.base-1]=g.lineups.home.find(p=>p.id!==g.batter.id).id;
 g.startField(36,id==='tag'?32:20,id==='tag'?0:.25,false);
 const lead=g.field.runners.at(-1);
 for(let i=0;i<2200&&!g.field.resolved;i++){
  g.updateField(.01);
  if(id==='tag'&&g.field.manual.fly&&!lead.running&&!lead.out&&lead.base===3)g.commandRunner(lead.id,4);
 }
 assert(g.field.resolved&&challengeWon(id,g.field),id);
}
console.log('PASS: dome ceiling clearance, four small ballparks, immutable replay, and three playable scenarios.');
