const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'dist',f),'utf8');
global.window=global;
for(const f of ['ratings-data.js','players.js','pennant.js','game.js','online-codec.js','online.js'])vm.runInThisContext(read(f),{filename:f});
const codec=NightOnlineCodec,clone=codec.clone,json=o=>JSON.parse(JSON.stringify(o)),size=o=>Buffer.byteLength(JSON.stringify(o));
const app=read('app.js'),cut=(a,b)=>{const i=app.indexOf(a);assert(i>=0,a);return app.slice(i,app.indexOf(b,i));};
const nested={n:3,nullable:1,arr:[{x:1,y:2},'hi'],old:9};
const newer={n:3,nullable:null,arr:[{x:1,z:5},'ok'],newProp:[1,2]};
const d=codec.encode(nested,newer);assert.deepEqual(codec.decode(nested,json(d)),newer);assert.deepEqual(nested,{n:3,nullable:1,arr:[{x:1,y:2},'hi'],old:9});
assert.deepEqual(codec.decode(nested,codec.encode(nested,nested)),nested);
assert.equal(codec.decode({a:1},codec.encode({a:1},null)),null);
// Actual field data, including the full roster, throws, changing manual
// runners, score/phase transitions and exact reconstruction after loss.
let seed=272;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const hostGame=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:true,weather:'clear'});
hostGame.onlineGame=true;hostGame.half='bottom';hostGame.bases=[true,true,true];hostGame.baseIds=hostGame.bases.map((b,i)=>hostGame.lineups[hostGame.side][5+i].id);
const guestGame=new NightGame('match','standard',()=>{},{userHome:false,manualRunning:true,weather:'clear'});
guestGame.onlineGame=true;guestGame.mirror=true;
let now=1000;
const messages=[],session={open:true,poseOpen:true,canSendState:()=>true,metrics:{jitter:0},send:m=>(messages.push(json(m)),true),sendPose:m=>(messages.push(json(m)),true)};
const host={role:'host',session,sync:{epoch:0,lock:null},stateSeq:0,lastFullAt:0,lastStateAt:0,poseSeq:0,fieldBase:null};
const guest={role:'guest',started:true,session,sync:{epoch:0,lock:null},lastRemoteSeq:0,lastPoseStamp:-Infinity};
const context=o=>vm.createContext({online:o,game:o===host?hostGame:guestGame,NightOnline,NightOnlineCodec,performance:{now:()=>now},Math,Date,
 updateUI:()=>{},$:(id)=>({textContent:''}),onlineApplyRemoteLock:s=>{guest.sync.epoch=s.epoch;guest.sync.lock=s.lock;guest.sync.recovering=s.recovering;guestGame.paused=!!s.lock||!!s.recovering;}});
const hc=context(host),gc=context(guest);
const shared=cut(' function onlineState(g,o)',' // ----- guest side:');
vm.runInContext(shared,hc);vm.runInContext(shared+cut(' function onlineGuestData(m)',' // The guest\'s innings'),gc);
const send=()=>{vm.runInContext('onlineTick(game)',hc);return messages.splice(0);};
const receive=m=>{gc.packet=m;vm.runInContext('onlineGuestData(packet)',gc);};
hostGame.startField(34,4,.1,false,false,{quality:.8,side:0});
let oldBytes=0,newBytes=0,poseCount=0,stateCount=0,lastPose=null;
const frames=[];
for(let step=0;step<480&&!hostGame.field.resolved;step++){
 if(hostGame.phase!=='field')break;
 hostGame.updateField(1/120);now+=1000/120;
 if(step%5===0){const f=codec.fieldWire(hostGame.field);frames.push(json(f));oldBytes+=size(f);}
 const out=send();
 for(const m of out){
  newBytes+=size(m);
  if(m.t==='pose'){
   poseCount++;const expected=codec.decode(host.fieldBase,m.d);
   assert.deepEqual(json(expected),json(codec.fieldWire(hostGame.field)));
   if(poseCount%3!==0){receive(m);if(lastPose)receive(lastPose);}
   lastPose=m;
  }else if(m.t==='state'){
   stateCount++;receive(m);
   const actual=codec.decode(guest.remoteFieldBase,guest.remoteState.field);
   assert.deepEqual(json(actual),json(codec.fieldWire(hostGame.field)));
  }
 }
}
assert(poseCount>5&&stateCount>2);
assert(newBytes<oldBytes*.9,`wire size ${newBytes}/${oldBytes}`);
assert(guestGame._fieldFrames.length<=12);
const oldStamp=guest.lastPoseStamp;if(lastPose){receive({...lastPose,epoch:-1,stamp:now+100000});assert.equal(guest.lastPoseStamp,oldStamp,'old epoch rejected');}
guestGame.mirrorTick(16);assert(guestGame.field);assert(guestGame.field.fielders.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));
const play=host.fieldBaseSeq;
// Reliable-only fallback must still deliver independent current poses.
session.poseOpen=false;
for(let i=0;i<10;i++){now+=70;if(hostGame.phase==='field')hostGame.updateField(1/120);for(const m of send()){assert.equal(m.t,'state');receive(m);}}
assert.equal(host.fieldBaseSeq,play);
// New play establishes fresh keyframe, even after old pose packets.
hostGame.startField(37,8,.12,false,false,{quality:.7,side:0});now+=100;
for(const m of send())receive(m);
assert.notEqual(guest.remoteFieldBaseSeq,play);
if(lastPose){const stamp=guest.lastPoseStamp;receive({...lastPose,stamp:now+1000});assert.equal(guest.lastPoseStamp,stamp);}
const replay={frames:frames.slice(0,72),hit:{kind:'single'},view:'outfield'},packed=codec.packReplay(replay),unpacked=codec.unpackReplay(json(packed));
assert.deepEqual(unpacked,replay);assert(size(packed)<size(replay)*.6,`replay ${size(packed)}/${size(replay)}`);
// Force a reconnect full packet / epoch and preserve host result.
host.sync.epoch=7;host.sync.recovering=true;host.fieldBase=null;host.stateCache=null;now+=100;
vm.runInContext('onlineTick(game,true)',hc);messages.splice(0).forEach(receive);
assert.equal(guest.sync.epoch,7);assert(guestGame.paused);
host.sync.recovering=false;now+=100;vm.runInContext('onlineTick(game,true)',hc);messages.splice(0).forEach(receive);assert(!guestGame.paused);
// Simulated channel config and buffer pressure.
let nativeOptions, native;
const fakeConn={peerConnection:{createDataChannel:(name,opts)=>(nativeOptions=opts,native={readyState:'open',bufferedAmount:0,send:s=>{native.last=s;},close:()=>{native.readyState='closed';}})},dataChannel:{id:0,bufferedAmount:0},on(){},send(){}};
const transport=new NightOnline.Session({onData:()=>{}},'host','ABC234');
transport.conn=fakeConn;transport.open=true;transport.setupPose(fakeConn);
assert.equal(nativeOptions.ordered,false);assert.equal(nativeOptions.maxRetransmits,0);assert(nativeOptions.negotiated);
assert(transport.sendPose({t:'pose',n:1}));native.bufferedAmount=5000;assert(!transport.sendPose({t:'pose',n:2}));fakeConn.dataChannel.bufferedAmount=40000;assert(!transport.canSendState());transport.destroy();
console.log('PASS v272: exact keyframe deltas, packet loss/reordering, reliable fallback, fresh play/epoch, replay round trip, native channel pressure. Live JSON bytes:',newBytes,'vs',oldBytes,'replay:',size(packed),'vs',size(replay));
