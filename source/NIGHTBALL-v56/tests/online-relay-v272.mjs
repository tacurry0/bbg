import assert from 'node:assert/strict';
import relay,{OnlineRoom} from '../server/online-relay.mjs';
const originalResponse=globalThis.Response;
class Socket {
 constructor(){this.readyState=1;this.out=[];}
 send(s){this.out.push(JSON.parse(s));}
 close(){this.readyState=3;}
 serializeAttachment(a){this.a=a;}
 deserializeAttachment(){return this.a;}
}
globalThis.WebSocketPair=class{constructor(){this[0]=new Socket();this[1]=new Socket();}};
globalThis.Response=class{constructor(body,options){this.body=body;Object.assign(this,options);}};
try{
 const data=new Map(),members=[],alarms=[];
 const ctx={storage:{get:k=>data.get(k),put:(k,v)=>data.set(k,v),setAlarm:t=>alarms.push(t),deleteAll:()=>data.clear()},getWebSockets:role=>members.filter(m=>m.role===role).map(m=>m.socket),acceptWebSocket:(s,roles)=>members.push({role:roles[0],socket:s})};
 const env={ALLOWED_ORIGIN:'https://tacurry0.github.io'},room=new OnlineRoom(ctx,env);
 const req=(role,token,code='ABC234',origin=env.ALLOWED_ORIGIN)=>new Request('https://relay.example.com/relay?room='+code+'&role='+role+'&token='+token,{headers:{Upgrade:'websocket',Origin:origin}});
 const ht='a'.repeat(32),gt='b'.repeat(32),ot='c'.repeat(32);
 assert.equal((await room.fetch(req('host',ht))).status,101);
 const h=room.socket('host');assert.equal(h.out.at(-1).relay,'waiting');
 assert.equal((await room.fetch(req('guest',gt))).status,101);
 const g=room.socket('guest');assert.equal(h.out.at(-1).peerToken,gt);assert.equal(g.out.at(-1).relay,'connected');
 assert.equal((await room.fetch(req('guest',ot))).status,409);
 assert.equal((await room.fetch(req('guest',gt,'ABC234','https://wrong.example'))).status,403);
 room.webSocketMessage(g,JSON.stringify({relay:'data',data:{t:'swing',delta:.04}}));
 assert.deepEqual(h.out.at(-1),{relay:'data',data:{t:'swing',delta:.04}});
 g.close();await room.webSocketClose(g);assert.equal(h.out.at(-1).relay,'waiting');
 assert.equal((await room.fetch(req('guest',gt))).status,101);
 const g2=room.socket('guest');assert.notEqual(g2,g);assert.equal(h.out.at(-1).relay,'connected');
 const before=h.out.length;room.webSocketMessage(g,JSON.stringify({relay:'data',data:{t:'stale'}}));assert.equal(h.out.length,before,'replaced sockets cannot transmit');
 h.close();g2.close();await room.webSocketClose(g2);await room.alarm();assert.equal(data.size,0);
 const routed=await relay.fetch(req('host',ht),{ROOMS:{idFromName:x=>x,get:x=>({fetch:async()=>x})}});assert.equal(routed,'ABC234');
 assert.equal((await relay.fetch(req('host',ht,'BAD!'),{})).status,404);
 console.log('PASS relay: room isolation, origin/token checks, forwarding, reconnection, cleanup');
}finally{globalThis.Response=originalResponse;delete globalThis.WebSocketPair;}
