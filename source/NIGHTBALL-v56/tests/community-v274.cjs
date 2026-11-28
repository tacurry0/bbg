// v274 community: deterministic in-memory PeerJS-like signalling and transport.
const fs=require('node:fs');
const read=f=>fs.readFileSync(__dirname+'/../dist/'+f,'utf8');

const check=(cond,msg)=>{if(!cond)throw Error(msg)};
function makeHarness(community,transport){
 let now=0,seq=0,queue=[],registry=new Map(),unnamed=0;
 const later=(fn,ms=0)=>{const item={id:++seq,at:now+Math.max(0,ms||0),fn,dead:false};queue.push(item);return item;};
 const clear=item=>{if(item)item.dead=true;};
 class Events{constructor(){this.listeners={}}on(k,fn){(this.listeners[k]??=[]).push(fn);return this}emit(k,v){for(const fn of this.listeners[k]||[])fn(v);}}
 class Conn extends Events{
  constructor(metadata){super();this.metadata=metadata;this.open=false;this.bufferSize=0;this.dataChannel={bufferedAmount:0};}
  send(m){if(!this.open)throw Error('closed');const data=JSON.parse(JSON.stringify(m));later(()=>{if(this.other.open)this.other.emit('data',data);},1);}
  close(){if(this.closed)return;this.closed=true;this.open=false;this.emit('close');if(this.other&&!this.other.closed){this.other.closed=true;this.other.open=false;this.other.emit('close');}}
 }
 class Peer extends Events{
  constructor(id){super();this.id=typeof id==='string'?id:'peer-'+(++unnamed);this.conns=[];later(()=>{if(this.destroyed)return;if(registry.has(this.id)){this.emit('error',{type:'unavailable-id'});return;}registry.set(this.id,this);this.emit('open',this.id);},1);}
  connect(id,options){const a=new Conn(options.metadata),b=new Conn(options.metadata);a.other=b;b.other=a;this.conns.push(a);later(()=>{if(this.destroyed)return;const p=registry.get(id);if(!p){this.emit('error',{type:'peer-unavailable'});return;}p.conns.push(b);p.emit('connection',b);if(a.closed||b.closed)return;a.open=b.open=true;a.emit('open');b.emit('open');},1);return a;}
  destroy(){if(this.destroyed)return;this.destroyed=true;if(registry.get(this.id)===this)registry.delete(this.id);for(const c of this.conns)c.close();this.emit('close');}
 }
 async function advance(ms){
  const end=now+ms;for(let n=0;n<10000;n++){
   for(let i=0;i<8;i++)await Promise.resolve();
   queue.sort((a,b)=>a.at-b.at||a.id-b.id);const item=queue.find(x=>!x.dead&&x.at<=end);
   if(!item){now=end;for(let i=0;i<8;i++)await Promise.resolve();return;}
   item.dead=true;now=item.at;item.fn();
  }throw Error('timer loop');
 }
 let rnd=0;
 function client(){
  const memory={},g={Peer,crypto:{getRandomValues(b){for(let i=0;i<b.length;i++)b[i]=++rnd%256;return b;}},NightOnline:{loadPeer:async()=>{},peerOptions:async()=>undefined,makeCode:()=>{const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let n=++rnd,s='';for(let i=0;i<6;i++){s+=a[n%a.length];n=Math.floor(n/a.length);}return s;}}};
  const storage={getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v};
  new Function('globalThis','localStorage','setTimeout','clearTimeout',community)(g,storage,later,clear);
  return {C:g.NightCommunity,g,storage};
 }
 return {client,advance,Peer,Conn,later,clear};
}
async function run(community,transport){
 const H=makeHarness(community,transport),clients=Array.from({length:4},()=>H.client()),[A,B,C,D]=clients.map(x=>x.C);
 for(const c of [A,B,C,D])c.start();
 await H.advance(2000);
 const profiles=clients.map(x=>x.C.profile());
 for(const c of [A,B,C,D])check(c.getSnapshot().members.length===4,'all participants discover each other');
 A.setRoom({code:'ABC234',mode:'match',status:'waiting',club:'CPBL',watch:true});
 await H.advance(500);
 check(B.getSnapshot().rooms[0]?.code==='ABC234','public room discovery');
 A.setRoom(null);await H.advance(500);
 check(B.getSnapshot().rooms.length===0,'closed room disappears');
 check(A.command({type:'create',title:'NIGHT CUP',size:4}),'create command');await H.advance(500);
 let cup=A.getSnapshot().tournaments[0];
 check(cup?.players.length===1,'cup created');
 for(const c of [B,C,D])c.command({type:'join',tournament:cup.id});
 await H.advance(500);check(A.getSnapshot().tournaments[0].players.length===4,'registered');
 A.command({type:'start',tournament:cup.id});await H.advance(500);
 cup=A.getSnapshot().tournaments[0];check(cup.matches.length===3&&cup.status==='playing','draw');
 const match=cup.matches[0],a=clients.find(x=>x.C.profile().id===match.a).C,b=clients.find(x=>x.C.profile().id===match.b).C;
 let fixture=a.findAssignmentFor(match.code);
 const m=a.beginMatch(match.code,b.profile(),true,{rated:true,tournament:fixture}),guest=b.acceptMatch(m,match.code);
 check(m.tournament&&guest.id===m.id,'match handshake');
 a.finishMatch(m,4,2);await H.advance(500);
 check(!A.getSnapshot().tournaments[0].matches[0].winner,'single result not sufficient');
 b.finishMatch(guest,4,2);await H.advance(500);
 let updated=A.getSnapshot().tournaments[0];check(updated.matches[0].winner===match.a&&updated.matches[2].a===match.a,'confirmed result advances');
 check(a.profile().rating===1516&&b.profile().rating===1484,'Elo update');
 a.finishMatch(m,4,2);check(a.profile().games===1,'duplicate result ignored');
 const draw=updated.matches[1],q={fixture:draw.id,code:draw.code,game:'f'.repeat(20),aScore:1,bScore:1};
 check(A.reportTournament(updated,draw.a,q)&&A.reportTournament(updated,draw.b,q)&&draw.draws===1&&!draw.winner,'draw replay');
 check(A.safeTournament(updated).matches.length===3,'snapshot valid');
 A.stop();await H.advance(15000);
 check(B.getSnapshot().members.length===3,'leader failover');
 check(B.getSnapshot().tournaments[0]?.matches[0]?.winner===match.a,'bracket migrated');
 for(const c of [B,C,D])c.stop();

 const ctx={};new Function('window','globalThis','localStorage','performance',transport)(ctx,ctx,{getItem:()=>null},{now:()=>1000});
 const S=ctx.NightOnline.Session,conn=new H.Conn({}),packets=[];
 conn.open=true;conn.send=m=>packets.push(m);
 const host=new S({allowSpectator:()=>true,onData:()=>{throw Error('spectator received input')}},'host','ABC234');
 host.addSpectator(conn);check(host.spectators.size===1&&!conn.listeners.data,'spectator cannot issue input');
 host.broadcastSpectators({hs:3,as:1},true);check(packets[0]?.t==='spectate-frame','spectator frame');
 const privateHost=new S({allowSpectator:()=>false},'host','ABC234'),rejected=new H.Conn({});
 privateHost.addSpectator(rejected);check(rejected.closed&&privateHost.spectators.size===0,'private room refuses spectator');
 return 'community mock tests passed: four peers, public listing, bracket, two-party report, rating, reconnect leader, read-only spectator';
}
run(read('online-community.js'),read('online.js')).then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
