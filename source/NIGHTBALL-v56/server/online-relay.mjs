// Optional Cloudflare Durable Object WebSocket relay for one BBG match.
// The browser host still owns baseball simulation. Deploy independently of Pages.
const validCode=s=>/^[A-HJ-KM-NP-Z2-9]{4,8}$/.test(s||'');
const validToken=s=>/^[0-9a-f]{32}$/.test(s||'');
const MAX_MESSAGE=524288;
const text=(message,status)=>new Response(message,{status});
export default {
 async fetch(request,env){
  const url=new URL(request.url),room=(url.searchParams.get('room')||'').toUpperCase();
  if(url.pathname!=='/relay'||!validCode(room)||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return text('not found',404);
  return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
 }
};
export class OnlineRoom{
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 socket(role){return this.ctx.getWebSockets(role).find(s=>s.readyState===1);}
 send(socket,data){try{if(socket?.readyState===1)socket.send(JSON.stringify(data));}catch{}}
 notify(){
  const host=this.socket('host'),guest=this.socket('guest');
  if(host&&guest){
   this.send(host,{relay:'connected',peerToken:guest.deserializeAttachment().token});
   this.send(guest,{relay:'connected'});
  }else this.send(host||guest,{relay:'waiting'});
 }
 async fetch(request){
  const url=new URL(request.url),room=(url.searchParams.get('room')||'').toUpperCase(),role=url.searchParams.get('role'),token=url.searchParams.get('token');
  if(!validCode(room)||!['host','guest'].includes(role)||!validToken(token)||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return text('invalid room',400);
  if(this.env.ALLOWED_ORIGIN&&request.headers.get('Origin')!==this.env.ALLOWED_ORIGIN)return text('forbidden origin',403);
  const admitted=await this.ctx.storage.get(role);
  if(admitted&&admitted!==token)return text('room occupied',409);
  await this.ctx.storage.put(role,token);
  const old=this.socket(role);
  if(old)try{old.close(4001,'replaced');}catch{}
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server,[role]);
  server.serializeAttachment({role,token});
  this.notify();
  // Clean up abandoned rooms even if the first player never meets anyone.
  await this.ctx.storage.setAlarm(Date.now()+120000);
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,message){
  if(typeof message!=='string'||message.length>MAX_MESSAGE){ws.close(1009,'message too large');return;}
  const a=ws.deserializeAttachment();if(!a||this.socket(a.role)!==ws)return;
  let m;try{m=JSON.parse(message);}catch{return;}
  if(m?.relay!=='data'||!m.data||typeof m.data!=='object'||typeof m.data.t!=='string')return;
  const target=this.socket(a.role==='host'?'guest':'host');
  try{if(target)target.send(message);}catch{}
 }
 async webSocketClose(ws){
  const a=ws.deserializeAttachment();
  if(a&&this.socket(a.role)===ws)return;
  this.notify();
  if(!this.socket('host')&&!this.socket('guest'))await this.ctx.storage.setAlarm(Date.now()+120000);
 }
 async webSocketError(ws){try{ws.close(1011,'connection error');}catch{}await this.webSocketClose(ws);}
 async alarm(){
  if(!this.socket('host')&&!this.socket('guest'))await this.ctx.storage.deleteAll();
  else await this.ctx.storage.setAlarm(Date.now()+120000);
 }
}
