// v112: recent rooms + guest host-waiting.
//  - Recent rooms: rooms the player hosted or joined are kept in
//    localStorage (code, role, own club, opponent club, last-used time),
//    deduplicated per code+role, pruned by count (8) and age (14 days),
//    individually forgettable; the online modal lists them with
//    reconnect/delete buttons wired to the same create/join flows.
//  - Guest waiting: joining a room whose host is not there yet no longer
//    fails. NightOnline.join with {wait:true} retries on an interval
//    (peer-unavailable), reports onWaiting, connects by itself once the
//    host opens the room, gives up with the usual 'notfound' after the
//    wait budget, and is cancelled by session.destroy() (the guest's
//    退出する). A pre-open connection error/close during the wait must
//    not surface as a disconnect.
// Transport is a FakePeer stub over BroadcastChannel (the established
// in-process stand-in for the PeerJS broker): peers discover each other
// by broadcast, connect() to an unknown id fails with 'peer-unavailable'
// exactly like the real broker.
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

/* ---------------- FakePeer over BroadcastChannel ---------------- */
const CHAN='nightball-v112-test-'+Math.random().toString(36).slice(2,9);
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
assert(NightOnline.loadRooms&&NightOnline.rememberRoom&&NightOnline.forgetRoom,'room helpers are exported');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=6000,what='condition'){
 const start=Date.now();
 while(Date.now()-start<timeout){if(fn())return;await sleep(25);}
 throw new Error('timeout waiting for '+what);
}

/* ---------------- (a) recent-room storage ---------------- */
{
 store.clear();
 const t0=1700000000000;
 let list=NightOnline.rememberRoom({code:'abc123',role:'host',club:'club-a'},t0);
 assert.equal(list.length,1);
 assert.deepEqual(list[0],{code:'ABC123',role:'host',club:'club-a',opp:null,at:t0},'entry is normalised and minimal');
 NightOnline.rememberRoom({code:'ABC123',role:'guest',club:'club-b'},t0+1);
 list=NightOnline.rememberRoom({code:'ABC123',role:'host',club:'club-a',opp:'club-b'},t0+2);
 assert.equal(list.length,2,'same code with a different role is a separate entry');
 assert.equal(list[0].role,'host','re-remembering moves the entry to the front');
 assert.equal(list[0].opp,'club-b','opponent club is updated');
 for(let i=0;i<10;i++)NightOnline.rememberRoom({code:'ROOM'+i,role:'guest'},t0+10+i);
 assert.equal(NightOnline.loadRooms(t0+100).length,NightOnline.ROOMS_MAX,'list is capped');
 const fresh=NightOnline.rememberRoom({code:'FRESH1',role:'host'},t0+NightOnline.ROOMS_TTL_MS+1000);
 assert(fresh.every(r=>r.code==='FRESH1'),'entries older than the TTL are pruned');
 NightOnline.rememberRoom({code:'DEL001',role:'host'},t0);
 NightOnline.rememberRoom({code:'DEL001',role:'guest'},t0);
 const after=NightOnline.forgetRoom('DEL001','host',t0);
 assert(after.some(r=>r.code==='DEL001'&&r.role==='guest')&&!after.some(r=>r.code==='DEL001'&&r.role==='host'),'forget removes only the matching role');
 assert.equal(NightOnline.rememberRoom({code:123,role:'host'},t0).length,after.length,'invalid entries are ignored');
 store.clear();
}

/* ---------------- E2E helpers ---------------- */
function hostHandlers(log){return {
 onReady:()=>log.push('host-ready'),
 onOpen:()=>log.push('host-open'),
 onData:m=>log.push('host-data:'+m.t),
 onClose:()=>log.push('host-close'),
 onError:k=>log.push('host-error:'+k),
};}
function guestHandlers(log){return {
 onOpen:()=>log.push('guest-open'),
 onData:m=>log.push('guest-data:'+m.t),
 onClose:()=>log.push('guest-close'),
 onWaiting:n=>log.push('wait:'+n),
 onError:k=>log.push('guest-error:'+k),
};}

async function main(){
 /* ---------- (a2) connect, record, reconnect from the entry ---------- */
 {
  store.clear();
  const hlog=[],glog=[];
  const host=await NightOnline.host('ROOM01',hostHandlers(hlog));
  const guest=await NightOnline.join('ROOM01',guestHandlers(glog));
  await until(()=>glog.includes('guest-open'),6000,'guest open');
  await until(()=>hlog.includes('host-open'),6000,'host open');
  guest.send({t:'club',club:'club-b'});
  await until(()=>hlog.includes('host-data:club'),6000,'host receives the guest club');
  // The app records the room at match start on both sides.
  NightOnline.rememberRoom({code:'ROOM01',role:'host',club:'club-a',opp:'club-b'});
  NightOnline.rememberRoom({code:'ROOM01',role:'guest',club:'club-b',opp:'club-a'});
  const rooms=NightOnline.loadRooms();
  assert.equal(rooms.length,2,'both sides recorded the room');
  host.destroy();guest.destroy();
  await sleep(60);
  // Reconnect using only what the list entry carries (same code, own role).
  const hlog2=[],glog2=[];
  const entry=rooms.find(r=>r.role==='host');
  const host2=await NightOnline.host(entry.code,hostHandlers(hlog2));
  const guest2=await NightOnline.join(entry.code,guestHandlers(glog2));
  await until(()=>glog2.includes('guest-open'),6000,'reconnect from the recent-room entry');
  host2.destroy();guest2.destroy();
 }

 /* ---------- (b) guest waits, host appears, auto-connect ---------- */
 {
  const glog=[];
  const guest=await NightOnline.join('LATER1',guestHandlers(glog),{wait:true,retryMs:250,maxWaitMs:10000});
  await sleep(1000);
  const waits=glog.filter(x=>x.startsWith('wait:')).length;
  assert(waits>=2,'guest keeps retrying while the host is absent, got '+JSON.stringify(glog));
  assert(!glog.some(x=>x.startsWith('guest-error')),'no error while waiting');
  assert(!glog.includes('guest-close'),'a failed attempt is not reported as a disconnect');
  assert(!glog.includes('guest-open'),'not connected before the host exists');
  const hlog=[];
  const host=await NightOnline.host('LATER1',hostHandlers(hlog));
  await until(()=>glog.includes('guest-open'),6000,'guest auto-connects once the host opens the room');
  guest.send({t:'club',club:'club-b'});
  await until(()=>hlog.includes('host-data:club'),6000,'data flows after the waited connection');
  host.destroy();guest.destroy();
 }

 /* ---------- (c) cancelling the wait ---------- */
 {
  const glog=[];
  const guest=await NightOnline.join('NEVER1',guestHandlers(glog),{wait:true,retryMs:250,maxWaitMs:10000});
  await until(()=>glog.some(x=>x.startsWith('wait:')),6000,'wait begins');
  guest.destroy();
  const snapshot=glog.slice();
  await sleep(900);
  assert.deepEqual(glog,snapshot,'no further waiting/error/open events after cancel: '+JSON.stringify(glog));
  const hlog=[];
  const host=await NightOnline.host('NEVER1',hostHandlers(hlog));
  await sleep(700);
  assert(!glog.includes('guest-open'),'a cancelled guest never connects, even when the host appears');
  host.destroy();
 }

 /* ---------- (d) wait budget expiry and non-wait behaviour ---------- */
 {
  const glog=[];
  await NightOnline.join('GONE01',guestHandlers(glog),{wait:true,retryMs:250,maxWaitMs:600});
  await until(()=>glog.includes('guest-error:notfound'),6000,'wait budget expiry reports notfound');
  const glog2=[];
  const guest2=await NightOnline.join('GONE02',guestHandlers(glog2));
  await until(()=>glog2.includes('guest-error:notfound'),6000,'non-wait join still fails immediately');
  assert(!glog2.some(x=>x.startsWith('wait:')),'non-wait join never waits');
  guest2.destroy();
 }

 /* ---------- app.js wiring (source guards) ---------- */
 {
  const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
  assert(app.includes('function recentRoomsHTML()'),'recent rooms section exists');
  assert(app.includes('${recentRoomsHTML()}'),'recent rooms render in the online entry modal');
  assert(app.includes('data-room-join=')&&app.includes('data-room-delete='),'entries carry reconnect and delete buttons');
  assert(app.includes('b.dataset.roomJoin'),'reconnect taps are handled');
  assert(app.includes("onlineCreateRoom(b.dataset.roomJoin)")&&app.includes("onlineJoinRoom(b.dataset.roomJoin)"),'reconnect re-enters the create/join flows by saved role');
  assert(app.includes('NightOnline.forgetRoom('),'delete removes the stored entry');
  assert(app.includes("rememberRoom({code,role:'host'"),'host rooms are recorded when the room is ready');
  assert(app.includes("rememberRoom({code:o.code,role:'host'"),'host rooms are refreshed at match start with the opponent');
  assert(app.includes("rememberRoom({code:o.code,role:'guest'"),'guest rooms are recorded at match start');
  assert(app.includes("{wait:true,retryMs:3000,maxWaitMs:120000}"),'guest joins wait for the host with a gentle cadence and budget');
  assert(app.includes('onWaiting:'),'waiting progress is surfaced to the guest UI');
  assert(app.includes('ホストを待っています'),'waiting status text exists');
  assert(app.includes("case'online-rejoin'"),'a manual retry path exists after the wait gives up');
  assert(app.includes('data-action="online-rejoin"'),'the retry button renders when the wait failed');
  const online=fs.readFileSync(__dirname+'/../dist/online.js','utf8');
  assert(online.includes("err?.type==='peer-unavailable'"),'waiting is driven by the broker peer-unavailable error');
 }

 console.log('rooms-v112: all assertions passed');
}

main().then(()=>{setTimeout(()=>process.exit(0),50);}).catch(e=>{console.error(e);process.exit(1);});
