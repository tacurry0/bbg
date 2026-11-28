// Regression: the authoritative host must finish an ABS + steal atomically,
// and both clients can skip a home-run trot or issue a legal intentional walk.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
const read=f=>fs.readFileSync(__dirname+'/../dist/'+f,'utf8');
for(const f of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','online-codec'])
 vm.runInThisContext(read(f+'.js'),{filename:f+'.js'});
const app=read('app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);assert(i>=0&&j>i);return app.slice(i,j);};
const protocol=cut(' function onlineSkipHomeRun(){',' function onlineDecisionVisible(kind){')+
 cut(' function onlineSendGameInput(msg){',' function onlineRequestSub(msg){')+
 cut(' function onlineHostData(m){',' // Apply a substitution')+
 cut(' function onlineState(g,o){',' function onlineTick(g,force=false){');
function pair(guestBats=true){
 const home=new NightGame('match','standard',()=>{},{userHome:true,remoteSide:'away',onlineMatch:true,weather:'clear'});
 const guest=new NightGame('match','standard',()=>{},{userHome:false,remoteSide:'home',onlineMatch:true,weather:'clear',clubs:home.teams});
 home.onlineGame=guest.onlineGame=true;guest.mirror=true;
 home.half=guestBats?'top':'bottom';home.prepare();home.broadcastIntro=null;
 home.rollHbp=()=>false;home.rollWildPitch=()=>false;
 home.bases=[true,false,false];home.baseIds=[home.lineups[home.side][8].id,null,null];home.basePitcherIds=[home.pitcher.id,null,null];
 const hostOnline={started:true,role:'host',pitchSeq:7,fieldBaseSeq:0,sync:{epoch:3,lock:null},session:{open:true}};
 const guestOnline={started:true,role:'guest',remotePitchSeq:7,sync:{epoch:3,lock:null},session:{open:true}};
 const feedback={scoreTime:0,resultTime:0,pendingReplay:false};
 let stamp=1000,forced=0;const chip={hidden:false};
 const common={performance:{now:()=>stamp},NightOnlineCodec,onlineMatchActive:()=>true,updateUI(){},updatePlaySkip(){},hideImpact(){},hideStageBanner(){},review:{},$:()=>chip};
 const h=vm.createContext({...common,online:hostOnline,game:home,playFeedback:feedback,onlineInputBlocked:()=>!!hostOnline.sync.lock,onlineTick:()=>{forced++;sync();}});
 const u=vm.createContext({...common,online:guestOnline,game:guest,playFeedback:{},onlineInputBlocked:()=>!!guestOnline.sync.lock,onlineTick(){throw Error('guest cannot simulate');}});
 vm.runInContext(protocol,h);vm.runInContext(protocol,u);
 guestOnline.session.send=m=>{h.onlineHostData(structuredClone(m));return true;};
 guest.mirrorSend=m=>u.onlineSendGameInput(m);
 function sync(){
  const s=structuredClone(h.onlineState(home,hostOnline));s.stamp=++stamp;
  hostOnline.fieldBaseSeq=s.fsq;guestOnline.remoteState=s;guestOnline.remotePitchSeq=s.pitchSeq;
  guest.applyMirror(s);guest.mirrorTick(0);return s;
 }
 sync();
 return {home,guest,h,u,hostOnline,guestOnline,feedback,sync,forced:()=>forced};
}
function withRandom(n,fn){const old=Math.random;Math.random=()=>n;try{return fn();}finally{Math.random=old;}}
function deliver(p){
 const g=p.home;g.phase='pitch';g.pitch={id:'fast',name:'Fastball',speed:145,targetX:.2,targetY:0,bx:0,by:0,duration:800,progress:1,logged:false,isStrike:true};
 p.hostOnline.pitchSeq++;p.sync();
}
for(const guestBats of [true,false]){
 for(const reviewed of [false,true])for(const out of [false,true]){
  const p=pair(guestBats),g=p.home,u=p.guest;
  g.outs=out?g.outsNeeded-1:0;p.sync();
  const batter=guestBats?u:g;
  assert(batter.setStealIntent(true));p.sync();
  assert.equal(g.steal,true);assert.equal(u.steal,guestBats);
  deliver(p);
  g.phase=reviewed?'abs-review':'abs-call';
  g.absCall={umpireStrike:true,strike:true,cpu:guestBats,remote:guestBats};
  const runner=g.baseIds[0];let notifications=0;
  g.emit=(type)=>{if(type==='update'){
    notifications++;
    assert(!(g.phase.startsWith('abs-')&&!g.absCall),'never expose a half-resolved ABS call to the renderer');
    assert.equal(g.phase,'result');
  }};
  withRandom(out?.999:.001,()=>g.resolveAbsCall(reviewed));
  assert.equal(notifications,1);assert.equal(g.phase,'result');assert.equal(g.steal,false);
  assert.equal(g.baseIds[0],null);assert.equal(g.baseIds[1],out?null:runner);
  p.sync();assert.equal(u.steal,false);assert.deepEqual(u.baseIds,g.baseIds);
  assert.equal(u.outs,g.outs);
  g.emit=()=>{};g.phaseTime=2000;g.update(16);
  assert.equal(g.phase,out?'change':'aim','next pitch or inning break is reachable');
 }
}
// Guest can cancel or arm a steal during the next windup if the same
// plate appearance is still active; stale requests must not affect it.
{
 const p=pair(),g=p.home,u=p.guest;
 assert(u.setStealIntent(true));p.sync();assert(g.steal&&u.steal);
 assert(u.setStealIntent(false));p.sync();assert(!g.steal&&!u.steal);
 const before=p.hostOnline.pitchSeq,key=g.plateAppearanceKey;
 g.phase='windup';p.hostOnline.pitchSeq++;
 p.h.onlineHostData({t:'steal',on:true,phase:'aim',pitchSeq:before,epoch:3,atBat:key});
 assert(g.steal);
 p.h.onlineHostData({t:'steal',on:false,phase:'aim',pitchSeq:before,epoch:3,atBat:'old'});assert(g.steal);
 p.h.onlineHostData({t:'steal',on:false,phase:'aim',pitchSeq:before,epoch:2,atBat:key});assert(g.steal);
}
// Consumed steal must never carry over after a walk / strikeout.
for(const strike of [false,true]){
 const p=pair(),g=p.home;deliver(p);g.steal=true;g.balls=3;g.strikes=2;
 g.commitCalledPitch(strike);assert(!g.steal);assert(g.batFinished);
}
// Host and guest use the same canonical HR result; score is already
// committed, skip is idempotent and doesn't cancel the separate replay.
for(const byGuest of [false,true]){
 const p=pair(false),g=p.home,u=p.guest;
 g.field={outcome:'hr',resolved:true,ball:{x:0,y:110,z:0},fielders:[],runners:[{id:g.batter.id,progress:1.3,target:4,x:4,y:15,running:true,out:false}]};
 g.phase='result';g.homeScore=2;g.home[0]=2;g.batFinished=true;
 p.feedback.pendingReplay=true;p.feedback.scoreTime=600;p.feedback.resultTime=1000;p.sync();
 assert(g.homeRunRunning&&u.homeRunRunning);
 p.h.onlineHostData({t:'home-run-skip',epoch:3,pitchSeq:7,fsq:p.hostOnline.fieldBaseSeq+1});
 assert(g.homeRunRunning,'old field cannot be skipped');
 assert((byGuest?p.u:p.h).onlineSkipHomeRun());
 assert(!g.homeRunRunning);assert.equal(g.field.runners[0].progress,4);
 assert.equal(g.homeScore,2);assert.equal(u.homeScore,2);
 assert.equal(p.feedback.pendingReplay,true);
 assert.equal(p.feedback.scoreTime,0);assert.equal(p.feedback.resultTime,0);
 assert(!p.h.onlineSkipHomeRun());assert(p.forced()>0);
}
// Intentional walk for either defense side, including forced-in run,
// duplicate/stale guest messages and blocked controls while paused.
for(const byGuest of [false,true]){
 const p=pair(!byGuest),g=p.home,u=p.guest,actor=byGuest?u:g;
 g.bases=[true,true,true];g.baseIds=g.lineups[g.side].slice(6,9).map(x=>x.id);
 g.basePitcherIds=g.baseIds.map(()=>g.pitcher.id);p.sync();
 const key=g.plateAppearanceKey,batter=g.batter.id,score=g.battingScore;
 assert(actor.canIntentionalWalk);assert(actor.intentionalWalk());p.sync();
 assert.equal(g.battingScore,score+1);assert.equal(g.baseIds[0],batter);
 assert.equal(g.box[batter].bb,1);assert.equal(g.pitcherRecord().pitches,0);
 assert.equal(g.phase,'result');assert.deepEqual(u.baseIds,g.baseIds);
 assert(!actor.intentionalWalk());g.phaseTime=2000;g.update(16);
 assert.equal(g.phase,'aim');assert.notEqual(g.plateAppearanceKey,key);
 if(byGuest)p.h.onlineHostData({t:'pitch-decision',ibb:true,atBat:key,pitchSeq:7,epoch:3});
 assert.equal(g.battingScore,score+1,'stale duplicate cannot walk another batter');
 g.paused=true;assert(!g.intentionalWalk(false,byGuest));
}
assert(read('game-hud.css').includes('#ibb:not([hidden])'));
assert(app.includes("call&&call!==absShownCall"),'guard ABS render against absent call');
console.log('PASS v273: host/guest HR skip, ABS steals (safe/out, review/pass), stale/duplicate commands, pitchless IBB and score synchronization');
