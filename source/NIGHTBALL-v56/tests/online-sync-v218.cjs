const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {resolve}=require('node:path');
const src=readFileSync(resolve(__dirname,'../dist/app.js'),'utf8');
const cut=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
// Execute the production protocol with independent clocks, deferred messages,
// and mocked presentation only. No network, sleeps or device-clock alignment.
const protocol=cut(' const ONLINE_SYNC_VERSION=218',' function onlineCleanup()')+
 cut(' function onlineHostData(m)',' // v182: online matches');
function peer(role){
 let time=0;
 const out=[],snap=[],modal={hidden:true,label:''},g={
  onlineGame:true,phase:'aim',phaseTime:0,paused:false,substitutionWindow:true,
  cursor:{x:0,y:0},remoteBatter:true,remotePitching:true,pitch:{swung:false},userHome:true,
  homePitcherIndex:0,awayPitcherIndex:1,usedPitchers:[0],usedCpuPitchers:[1],
  attempt(){this.swings=(this.swings||0)+1;},
  remoteThrowPitch(){this.throws=(this.throws||0)+1;},
  setCursor(x,y){this.cursor={x,y};},
  substitute(id){this.subbed={id,guest:!this.userHome};return true;},
  emit(){},resolveAbsCall(){this.phase='result';this.passed=true;},
  resolvePlayCall(){this.phase='result';this.passed=true;},
  requestAbsChallenge(){if(this.phase==='abs-call'){this.phase='abs-review';this.challenged=true;}},
  requestPlayChallenge(){if(this.phase==='play-call')this.phase='play-review';}
 };
 const o={role,started:true,pitchSeq:7,remotePitchSeq:7,session:{open:true,send:m=>out.push(structuredClone(m))},delayQueue:{clear(){o.cleared=true;}}};
 const c=vm.createContext({
  performance:{now:()=>time},document:{hidden:false},online:o,game:g,modalKind:'',
  review:{playback:null,clip:null},playFeedback:{pendingReplay:false,scoreTime:0,callTime:0},
  $:id=>id==='modal'?modal:{querySelector:()=>({textContent:modal.label})},modalTitle:()=>'',toast:()=>{},updateUI:()=>{},
  onlinePeerGone:()=>{o.sync.disconnected=true;g.paused=true;},
  modal:(html,kind)=>{modal.hidden=false;modal.label=html;c.modalKind=kind;},closeModal:()=>{modal.hidden=true;c.modalKind='';},
  pause:()=>{modal.hidden=false;c.modalKind='pause';},benchModal:()=>{modal.hidden=false;c.modalKind='bench';},
  launchReplayLocal:()=>{c.review.playback={};return true;},
  onlineTick:()=>snap.push(structuredClone({epoch:o.sync.epoch,lock:o.sync.lock,decision:o.sync.decision&&{id:o.sync.decision.id,kind:o.sync.decision.kind,owner:o.sync.decision.owner}})),
 });
 vm.runInContext(protocol+'\nonlineInitSync(online);',c);
 return {c,g,o,out,snap,modal,at:t=>{time=t;},run:code=>vm.runInContext(code,c),receive:m=>c.onlineHostData(m)};
}
const h=peer('host'),u=peer('guest');
function apply(){const s=h.snap.at(-1);if(!s)return;u.o.sync.decision=s.decision;u.c.onlineApplyRemoteLock(structuredClone(s));}
function drain(){while(u.out.length)h.receive(u.out.shift());}
function lock(kind,owner='host'){h.c.onlineAcquire(kind,owner,kind==='menu'?'bench':null);apply();}
function release(){apply();drain();apply();}
h.g.phase='pitch';h.c.onlineRequestMenu('pause');assert.equal(h.g.paused,false,'let current pitch finish');
h.g.phase='aim';h.c.onlineSyncTick();apply();assert.equal(h.o.sync.lock.kind,'menu');assert(h.g.paused&&u.g.paused);assert.equal(u.c.modalKind,'online-hold');
h.receive({t:'pitch-decision',epoch:h.o.sync.epoch,pitchSeq:7});assert(!h.g.throws);
h.c.onlineFinishLocalLock();assert(h.g.paused);release();assert(!h.g.paused&&!u.g.paused);
h.receive({t:'pitch-decision',epoch:1,pitchSeq:7});assert(!h.g.throws,'old epoch rejected');
h.receive({t:'pitch-decision',epoch:h.o.sync.epoch,pitchSeq:6});assert(!h.g.throws,'old pitch rejected');
h.receive({t:'pitch-decision',epoch:h.o.sync.epoch,pitchSeq:7});assert.equal(h.g.throws,1);
u.c.onlineRequestMenu('bench');drain();apply();assert.equal(u.c.modalKind,'bench');assert(h.g.paused&&u.g.paused);
u.c.onlineRequestSub({kind:'hit',id:'reserve'});drain();assert.deepEqual(h.g.subbed,{id:'reserve',guest:true});assert(h.g.userHome,'host perspective restored');assert(h.out.some(x=>x.t==='sync-sub-result'&&x.ok));
u.c.onlineFinishLocalLock();drain();assert(h.g.paused);release();assert(!h.g.paused&&!u.g.paused);
// Both independent replay completions are required. A stale guest action
// while the host is still watching cannot change the simulation.
lock('replay','both');h.c.onlineFinishLocalLock();assert(h.g.paused&&!h.o.sync.lock.releasing);
h.receive({t:'runner-command',epoch:h.o.sync.epoch,pitchSeq:7});assert(h.g.paused);
u.c.onlineFinishLocalLock();drain();assert(h.o.sync.lock.releasing&&h.g.paused);release();assert(!h.g.paused&&!u.g.paused);
// Delay the visibility ACK and the actual challenge independently: host
// must not resolve from its own phase clock. IDs make old calls harmless.
h.g.phase=u.g.phase='abs-call';h.g.absCall={cpu:true,remote:true};h.at(1000);h.c.onlineDecisionTick();
h.c.onlineTick(h.g);apply();u.at(3500);assert(u.c.onlineDecisionVisible('abs'));
h.at(6500);h.c.onlineDecisionTick();assert.equal(h.g.phase,'abs-call');
drain();h.at(10000);h.c.onlineDecisionTick();assert.equal(h.g.phase,'abs-call');
u.at(6499);assert(u.c.onlineDecisionVisible('abs'));u.c.onlineSendGameInput({t:'abs-challenge'});assert(!u.c.onlineDecisionVisible('abs'));
h.at(12000);drain();assert(h.g.challenged);h.c.onlineDecisionTick();
h.g.phase=u.g.phase='abs-call';h.g.absCall={cpu:true,remote:true};h.c.onlineDecisionTick();h.c.onlineTick(h.g);apply();
u.at(10000);assert(u.c.onlineDecisionVisible('abs'));drain();
h.receive({t:'abs-challenge',epoch:h.o.sync.epoch,decision:1});assert.equal(h.g.phase,'abs-call');
u.at(13001);assert(!u.c.onlineDecisionVisible('abs'));assert.equal(h.g.phase,'abs-call');drain();assert(h.g.passed);
h.g.phase='abs-call';h.g.absCall={cpu:false};h.c.onlineDecisionTick();h.at(20000);assert(h.c.onlineDecisionVisible('abs'));h.at(22999);h.c.onlineDecisionTick();assert.equal(h.g.phase,'abs-call');h.at(23001);h.c.onlineDecisionTick();assert.equal(h.g.phase,'result');
h.g.phase='abs-call';h.g.absCall={cpu:true,remote:true};h.c.onlineDecisionTick();h.at(39000);h.c.onlineDecisionTick();assert(h.o.sync.disconnected&&h.g.paused);assert.equal(h.g.phase,'abs-call','lost connection cannot silently commit');
console.log('PASS: host/guest menu, ACK release, guest substitution, stale inputs, two-party replay, delayed ABS challenge, expiry, disconnect');
