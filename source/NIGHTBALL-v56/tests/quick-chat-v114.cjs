// v114: online quick chat. Preset phrases only, exchanged by index:
//  - NightOnline.QUICK_CHATS is the single shared phrase list and
//    quickChatText(index) is the receiver-side validator (anything that
//    is not an in-range integer index resolves to null and is dropped);
//  - app.js builds the phrase buttons into the reaction panel, sends
//    {t:'chat', i} on tap, and both the host and guest data handlers
//    route incoming chat messages to the bubble display;
//  - transport is the FakePeer-over-BroadcastChannel stub (as rooms-v112).
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

/* ---------------- FakePeer over BroadcastChannel (from rooms-v112) ---------------- */
const CHAN='nightball-v114-test-'+Math.random().toString(36).slice(2,9);
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

/* ---------------- phrase list + validation ---------------- */
{
 assert(Array.isArray(NightOnline.QUICK_CHATS),'phrase list is exported');
 assert(NightOnline.QUICK_CHATS.length>=8,'a useful set of phrases');
 assert(NightOnline.QUICK_CHATS.every(t=>typeof t==='string'&&t.length>0&&t.length<=12),'phrases are short non-empty strings');
 assert.equal(new Set(NightOnline.QUICK_CHATS).size,NightOnline.QUICK_CHATS.length,'no duplicate phrases');
 assert.equal(NightOnline.quickChatText(0),NightOnline.QUICK_CHATS[0]);
 assert.equal(NightOnline.quickChatText(NightOnline.QUICK_CHATS.length-1),NightOnline.QUICK_CHATS.at(-1));
 assert.equal(NightOnline.quickChatText('2'),NightOnline.QUICK_CHATS[2],'numeric strings from the wire are accepted');
 for(const bad of [-1,NightOnline.QUICK_CHATS.length,99,1.5,NaN,'x',null,undefined,{}])
  assert.equal(NightOnline.quickChatText(bad),null,'invalid index dropped: '+String(bad));
}

/* ---------------- app wiring (source guards) ---------------- */
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 assert(app.includes("send({t:'chat',i:index})"),'tap sends the phrase index');
 assert(app.includes('data-chat='),'panel builds phrase buttons');
 assert(app.includes('NightOnline.QUICK_CHATS.map'),'panel phrases come from the shared list');
 assert((app.match(/m\.t==='chat'/g)||[]).length>=2,'host and guest handlers both route chat');
 assert(app.includes('showQuickChat(t,false)'),'incoming chat renders the bubble');
 assert(html.includes('id="chat-pop"'),'bubble element exists in the game stage');
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=6000,what='condition'){
 const start=Date.now();
 while(Date.now()-start<timeout){if(fn())return;await sleep(25);}
 throw new Error('timeout waiting for '+what);
}

async function main(){
 /* ---------------- E2E: phrases travel both ways ---------------- */
 const hlog=[],glog=[];
 const host=await NightOnline.host('CHAT01',{onData:m=>hlog.push(m),onOpen:()=>hlog.push('open')});
 const guest=await NightOnline.join('CHAT01',{onData:m=>glog.push(m),onOpen:()=>glog.push('open')});
 await until(()=>glog.includes('open')&&hlog.includes('open'),6000,'both sides connected');
 guest.send({t:'chat',i:1});
 await until(()=>hlog.some(m=>m&&m.t==='chat'),6000,'host receives guest chat');
 const got=hlog.find(m=>m&&m.t==='chat');
 assert.equal(NightOnline.quickChatText(got.i),'ナイスプレイ！','host resolves the phrase');
 host.send({t:'chat',i:0});
 await until(()=>glog.some(m=>m&&m.t==='chat'),6000,'guest receives host chat');
 assert.equal(NightOnline.quickChatText(glog.find(m=>m&&m.t==='chat').i),'よろしく！');
 // A tampered index is dropped by the receiver-side validator.
 assert.equal(NightOnline.quickChatText(99),null,'out-of-range phrase is dropped, never rendered');
 host.destroy();guest.destroy();
 console.log('quick-chat-v114: all assertions passed');
}
main().catch(e=>{console.error(e);process.exit(1);});
