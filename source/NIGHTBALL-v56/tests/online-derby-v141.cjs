// v141: online HR derby (checker item online-hr-derby).
//  - NightOnlineDerby owns the contest state: two players alternate ONE
//    swing at a time, SWINGS_PER_PLAYER each; record() enforces the turn
//    order and the per-player budget on BOTH copies of the state, so an
//    out-of-turn or duplicate result is ignored by the host as well.
//  - Sync is the documented simple model: each side bats on its own
//    device with the regular derby engine and sends only the resolved
//    {hr, distance}; the host closes the contest with {t:'derby-end'}.
//  - E2E transport is the established FakePeer stub over
//    BroadcastChannel (rooms-v112), standing in for the PeerJS broker.
//  - A real NightGame('derby') batted ball must surface through the
//    'hit' event the app hooks (onlineDerbyOnHit) with kind/distance.
//  - The normal online match flow (lobby club exchange, {t:'start'})
//    is untouched.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
const store=new Map();
global.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k),
};
for(const file of ['ratings-data','players','pennant','derby','online-derby','game'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
const D=global.NightOnlineDerby;
assert(D,'NightOnlineDerby is exported');
assert.equal(D.SWINGS_PER_PLAYER,10,'ten swings each keeps the mode short');

/* ---------------- contest logic ---------------- */
{
 const hostClub=NightTeams.get('owls'),guestClub=NightTeams.get('foxes');
 const hb=D.pickBatter(hostClub),gb=D.pickBatter(guestClub);
 assert(hb&&gb,'a derby batter is picked for each club');
 assert(hostClub.batters.every(p=>p.power<=hb.power),'host batter is the club power leader');
 assert(guestClub.batters.every(p=>p.power<=gb.power),'guest batter is the club power leader');
 const mk=()=>D.create({swings:3,host:{clubId:'owls',batterId:hb.id,name:hb.name,clubName:hostClub.name},guest:{clubId:'foxes',batterId:gb.id,name:gb.name,clubName:guestClub.name}});
 const s=mk();
 assert.equal(D.turnIndex(s),0,'host swings first');
 assert.equal(D.record(s,1,{hr:true,distance:140}),false,'guest cannot swing out of turn');
 assert.equal(s.players[1].hr,0,'out-of-turn result is not tallied');
 assert.equal(D.record(s,0,{hr:true,distance:120}),true);
 assert.equal(D.turnIndex(s),1,'turn alternates to the guest');
 assert.equal(D.record(s,0,{hr:true,distance:150}),false,'host cannot swing twice in a row');
 assert.equal(D.record(s,1,{hr:false,distance:98.6}),true);
 assert.equal(s.players[1].maxDistance,99,'distance is rounded and tracked');
 assert.equal(D.winner(s),null,'no winner before the contest ends');
 D.record(s,0,{hr:false,distance:110});D.record(s,1,{hr:true,distance:125});
 D.record(s,0,{hr:false,distance:100});D.record(s,1,{hr:false,distance:90});
 assert(D.isOver(s),'contest ends when both budgets are spent');
 assert.equal(D.turnIndex(s),-1);
 assert.equal(D.record(s,0,{hr:true,distance:200}),false,'no swings after the end');
 assert.equal(D.winner(s),1,'level on homers (1-1): longest distance decides (125 > 120)');
 const t=mk();
 for(let i=0;i<3;i++){D.record(t,0,{hr:true,distance:100});D.record(t,1,{hr:false,distance:130});}
 assert.equal(D.winner(t),0,'more home runs beats a longer single distance');
 const u=mk();
 for(let i=0;i<3;i++){D.record(u,0,{hr:true,distance:120});D.record(u,1,{hr:true,distance:120});}
 assert.equal(D.winner(u),'draw','identical tallies are a draw');
}

/* ---------------- real derby engine -> hit event ---------------- */
{
 const events=[];
 const g=new NightGame('derby','standard',(type,data)=>events.push([type,data]),{park:'tokyo-dome',fieldSpeed:2});
 g.derby.remaining=3600000;
 g.beginHalf();
 g.startField(63,29,-.6,false);
 let guard=0;
 while(g.phase==='field'&&guard++<2000)g.update(16);
 const hit=events.find(([t])=>t==='hit')?.[1];
 assert(hit,'a resolved derby batted ball emits the hit event the app hooks');
 assert.equal(hit.kind,'hr');
 assert(hit.distance>0,'the hit carries a distance for the tally');
 const s=D.create({swings:1,host:{clubId:'owls',name:'H'},guest:{clubId:'foxes',name:'G'}});
 assert(D.record(s,0,{hr:hit.kind==='hr',distance:hit.distance}),'the engine result records as a swing');
 assert.equal(s.players[0].hr,1);
 assert.equal(s.players[0].maxDistance,Math.round(hit.distance));
}

/* ---------------- FakePeer over BroadcastChannel ---------------- */
const CHAN='nightball-v141-test-'+Math.random().toString(36).slice(2,9);
let connSeq=0;
class FakeConn{
 constructor(localPeer,remoteId,cid){this.localPeer=localPeer;this.remoteId=remoteId;this.cid=cid;this._h={};}
 on(ev,fn){(this._h[ev]??=[]).push(fn);return this;}
 _emit(ev,...args){for(const f of this._h[ev]||[])f(...args);}
 send(data){this.localPeer._post({kind:'data',cid:this.cid,to:this.remoteId,data});}
 close(){this._emit('close');this.localPeer._post({kind:'conn-close',cid:this.cid,to:this.remoteId});}
}
class FakePeer{
 constructor(id){
  this.id=typeof id==='string'?id:'guest-'+Math.random().toString(36).slice(2,10);
  this._h={};this._conns=new Map();this._known=new Set();this.destroyed=false;
  this._bc=new BroadcastChannel(CHAN);
  this._bc.onmessage=e=>this._onMsg(e.data);
  this._post({kind:'hello'});
  this._post({kind:'register'});
  setTimeout(()=>this._emit('open',this.id),25);
 }
 on(ev,fn){(this._h[ev]??=[]).push(fn);return this;}
 _emit(ev,...args){for(const f of this._h[ev]||[])f(...args);}
 _post(msg){if(!this.destroyed)try{this._bc.postMessage({...msg,from:this.id});}catch{}}
 _onMsg(m){
  if(!m||m.from===this.id)return;
  if(m.kind==='hello'){this._known.add(m.from);this._post({kind:'register'});}
  else if(m.kind==='register')this._known.add(m.from);
  else if(m.kind==='unregister')this._known.delete(m.from);
  else if(m.kind==='connect'&&m.to===this.id){
   const conn=new FakeConn(this,m.from,m.cid);this._conns.set(m.cid,conn);
   this._emit('connection',conn);
   this._post({kind:'conn-accept',cid:m.cid,to:m.from});
   setTimeout(()=>conn._emit('open'),5);
  }
  else if(m.kind==='conn-accept'&&m.to===this.id){const c=this._conns.get(m.cid);if(c)setTimeout(()=>c._emit('open'),5);}
  else if(m.kind==='data'&&m.to===this.id){const c=this._conns.get(m.cid);if(c)c._emit('data',m.data);}
  else if(m.kind==='conn-close'&&m.to===this.id){const c=this._conns.get(m.cid);if(c)c._emit('close');}
 }
 connect(remoteId){
  const cid='c'+(++connSeq);
  const conn=new FakeConn(this,remoteId,cid);this._conns.set(cid,conn);
  this._post({kind:'hello'});
  setTimeout(()=>{
   if(this.destroyed)return;
   if(this._known.has(remoteId))this._post({kind:'connect',cid,to:remoteId});
   else{this._emit('error',{type:'peer-unavailable'});conn._emit('error',new Error('peer-unavailable'));}
  },15);
  return conn;
 }
 destroy(){
  if(this.destroyed)return;this.destroyed=true;
  this._post({kind:'unregister'});
  try{this._bc.close();}catch{}
 }
}
global.Peer=FakePeer;
vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/online.js','utf8'),{filename:'online.js'});
const {NightOnline}=global;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=6000,what='condition'){
 const start=Date.now();
 while(Date.now()-start<timeout){if(fn())return;await sleep(20);}
 throw new Error('timeout waiting for '+what);
}

async function main(){
 /* ---------- E2E: lobby mode, start, alternating swings, result ---------- */
 const hostClub=NightTeams.get('owls'),guestClub=NightTeams.get('foxes');
 const hb=D.pickBatter(hostClub),gb=D.pickBatter(guestClub);
 const entrants=()=>({host:{clubId:'owls',batterId:hb.id,name:hb.name,clubName:hostClub.name},guest:{clubId:'foxes',batterId:gb.id,name:gb.name,clubName:guestClub.name}});
 const hostSide={contest:null,log:[]},guestSide={contest:null,log:[]};
 let hostSession,guestSession;
 hostSession=await NightOnline.host('DRBY01',{
  onOpen:()=>{},
  onData:m=>{
   hostSide.log.push(m.t);
   if(m.t==='club')hostSession.send({t:'lobby-mode',mode:'derby'});
   else if(m.t==='derby-swing')D.record(hostSide.contest,1,{hr:!!m.hr,distance:Number(m.distance)||0});
  },
  onError:k=>{throw new Error('host error '+k);},
 });
 guestSession=await NightOnline.join('DRBY01',{
  onOpen:()=>guestSession.send({t:'club',club:'foxes'}),
  onData:m=>{
   guestSide.log.push(m.t);
   if(m.t==='start-derby'){
    guestSide.contest=D.create({swings:m.swings,...entrants()});
    guestSide.startMsg=m;
   }else if(m.t==='derby-swing')D.record(guestSide.contest,0,{hr:!!m.hr,distance:Number(m.distance)||0});
   else if(m.t==='derby-end')guestSide.endMsg=m;
  },
  onError:k=>{throw new Error('guest error '+k);},
 });
 await until(()=>hostSide.log.includes('club'),6000,'host receives the guest club');
 await until(()=>guestSide.log.includes('lobby-mode'),6000,'guest is told the room mode is derby');

 // Host starts the derby: parameters travel in {t:'start-derby'}.
 hostSide.contest=D.create({swings:10,...entrants()});
 hostSession.send({t:'start-derby',hostClub:'owls',guestClub:'foxes',hostBatter:hb.id,guestBatter:gb.id,park:'tokyo-dome',swings:10,difficulty:'standard'});
 await until(()=>!!guestSide.contest,6000,'guest builds the contest from start-derby');
 assert.equal(guestSide.startMsg.hostBatter,hb.id,'the host-chosen batters travel with the start message');

 // Out-of-turn guest result first: the host copy must ignore it.
 guestSession.send({t:'derby-swing',hr:true,distance:150});
 await sleep(300);
 assert.equal(hostSide.contest.taken,0,'host ignores an out-of-turn guest result');
 assert.equal(hostSide.contest.players[1].hr,0);

 // Scripted alternating swings: host HRs on swings 1 and 3, guest on 2.
 const hostResults=[{hr:true,distance:120},{hr:true,distance:131},...Array.from({length:8},()=>({hr:false,distance:95}))];
 const guestResults=[{hr:true,distance:125},...Array.from({length:9},()=>({hr:false,distance:90}))];
 for(let i=0;i<10;i++){
  assert.equal(D.turnIndex(hostSide.contest),0,'host turn in round '+(i+1));
  assert(D.record(hostSide.contest,0,hostResults[i]),'host records its own swing');
  hostSession.send({t:'derby-swing',...hostResults[i]});
  await until(()=>guestSide.contest.taken===hostSide.contest.taken,6000,'guest tallies the host swing');
  assert.equal(D.turnIndex(guestSide.contest),1,'guest turn in round '+(i+1));
  assert(D.record(guestSide.contest,1,guestResults[i]),'guest records its own swing');
  guestSession.send({t:'derby-swing',...guestResults[i]});
  await until(()=>hostSide.contest.taken===guestSide.contest.taken,6000,'host tallies the guest swing');
 }
 assert(D.isOver(hostSide.contest)&&D.isOver(guestSide.contest),'both copies finish after 20 swings');
 assert.deepEqual(guestSide.contest.players,hostSide.contest.players,'both sides tally identical results');
 assert.equal(hostSide.contest.players[0].hr,2);
 assert.equal(hostSide.contest.players[0].maxDistance,131);
 assert.equal(hostSide.contest.players[1].hr,1);
 assert.equal(D.winner(hostSide.contest),0,'host wins 2-1 on homers');
 assert.equal(D.winner(guestSide.contest),D.winner(hostSide.contest),'the verdict matches on both sides');
 hostSession.send({t:'derby-end',winner:D.winner(hostSide.contest),players:hostSide.contest.players.map(p=>({hr:p.hr,maxDistance:p.maxDistance,used:p.used}))});
 await until(()=>!!guestSide.endMsg,6000,'guest receives the host final tally');
 assert.equal(guestSide.endMsg.winner,0);
 assert.deepEqual(guestSide.endMsg.players,[{hr:2,maxDistance:131,used:10},{hr:1,maxDistance:125,used:10}],'final tally carries both players\u2019 homers and longest distance');
 hostSession.destroy();guestSession.destroy();

 /* ---------- normal online match flow still works ---------- */
 {
  const hlog=[],glog=[];
  const host=await NightOnline.host('NORM01',{onOpen:()=>{},onData:m=>hlog.push(m.t),onError:k=>hlog.push('error:'+k)});
  const guest=await NightOnline.join('NORM01',{onOpen:()=>guest.send({t:'club',club:'foxes'}),onData:m=>glog.push(m.t),onError:k=>glog.push('error:'+k)});
  await until(()=>hlog.includes('club'),6000,'normal lobby club exchange');
  host.send({t:'start',home:'owls',away:'foxes',innings:5,difficulty:'standard',park:'night'});
  await until(()=>glog.includes('start'),6000,'normal match start message still flows');
  host.destroy();guest.destroy();
 }

 /* ---------- app.js wiring (source guards) ---------- */
 {
  const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
  assert(app.includes('data-online-mode='),'host lobby offers a mode choice');
  assert(app.includes("o.mode==='derby'"),'host lobby branches on the derby mode');
  assert(app.includes("{t:'lobby-mode',mode:online.mode}"),'host tells the guest the chosen mode');
  assert(app.includes("m.t==='lobby-mode'"),'guest follows the host mode');
  assert(app.includes("m.t==='start-derby'"),'guest starts the derby from the host message');
  assert(app.includes('function startOnlineDerby()'),'host derby start exists');
  assert(app.includes('function setupOnlineDerby('),'shared derby setup exists');
  assert(app.includes("new NightGame('derby'"),'derby swings run on the existing derby engine');
  assert(app.includes('game.onlineDerby=true'),'the derby game is flagged so the match flow is untouched');
  assert(app.includes("o.session?.send({t:'derby-swing'"),'own results are sent to the peer');
  assert(app.includes("m.t==='derby-swing'"),'peer results are received on both sides');
  assert(app.includes('onlineDerbyOnPeerSwing(m)'),'peer results go through the validating tally');
  assert(app.includes("o.session?.send({t:'derby-end'"),'host sends the final tally');
  assert(app.includes('function onlineDerbyResultModal()'),'result screen shows both tallies and the verdict');
  assert(app.includes("case'derby-rematch'"),'derby rematch follows the online rematch flow');
  assert(app.includes("if(o.mode==='derby'){startOnlineDerby();return;}"),'match start branches to derby only in derby mode');
  assert(app.includes("new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away}"),'normal online match creation is unchanged');
  const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
  const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
  assert(index.includes('./online-derby.js?v=1'),'index loads the online derby module');
  assert(sw.includes('./online-derby.js?v=1'),'SW precaches the online derby module');
  assert(index.includes('./game.js?v=141')&&index.includes('./app.js?v=141'),'index pins move to v141');
  assert(sw.includes('nightball-v141-online-derby'),'SW cache renamed for v141');
 }

 console.log('online-derby-v141: all assertions passed');
}
main().then(()=>{setTimeout(()=>process.exit(0),50);}).catch(e=>{console.error(e);process.exit(1);});
