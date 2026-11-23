/* NIGHTBALL online play: PeerJS (WebRTC) transport with room codes.
   The host runs the game; the guest only sends decisions. No server of our
   own: PeerJS's free cloud broker only introduces the two browsers. */
(()=>{
 const CDN='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
 const PREFIX='nightball-duel-';
 let loadPromise=null;
 function loadPeer(){
  if(window.Peer)return Promise.resolve();
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
   const s=document.createElement('script');
   s.src=CDN;s.onload=()=>resolve();s.onerror=()=>reject(new Error('peer-load-failed'));
   document.head.appendChild(s);
  });
  return loadPromise;
 }
 /* ---- online input-delay equalization (v107 latency) ----
    The guest's inputs reach the host one network one-way trip late, while
    the host's own inputs apply instantly: a structural host advantage.
    The host measures the round-trip time with ping/pong, estimates the
    one-way delay, and holds its OWN timing inputs (swing, pitch release,
    steal, intentional walk) in a delay queue for that long, so both sides'
    decisions take effect after roughly the same latency.
    Cap rationale (150ms): consumer broadband / 4G one-way delay is almost
    always below ~75ms; 150ms covers poor links while keeping the host's
    controls responsive — beyond that the added sluggishness costs more
    fairness (reactions to a moving pitch) than it buys. */
 const LATENCY_MAX_MS=150;
 const PING_INTERVAL_MS=2000;
 function clampDelay(ms){
  const n=Number(ms);
  if(!Number.isFinite(n)||n<=0)return 0;
  return Math.min(LATENCY_MAX_MS,Math.round(n));
 }
 class LatencyEstimator{
  constructor(){this.reset();}
  reset(){this.samples=0;this.ewma=null;this.best=Infinity;this.offset=null;}
  /* Feed one ping/pong round trip. guestClock/hostSendTs are optional and
     let the estimator align the guest's unsynchronized clock: the guest
     stamped the pong at guestClock, which corresponds to the host-clock
     midpoint of the round trip. */
  add(rtt,guestClock,hostSendTs){
   const n=Number(rtt);
   if(!Number.isFinite(n)||n<0||n>10000)return this.oneWayMs();
   this.samples++;
   this.best=Math.min(this.best,n);
   // EWMA (alpha .25) smooths jitter; the best-sample anchor below keeps a
   // run of queued spikes from inflating the estimate for long.
   this.ewma=this.ewma===null?n:this.ewma+.25*(n-this.ewma);
   if(Number.isFinite(guestClock)&&Number.isFinite(hostSendTs)){
    const off=guestClock-(hostSendTs+n/2);
    this.offset=this.offset===null?off:this.offset+.25*(off-this.offset);
   }
   return this.oneWayMs();
  }
  oneWayMs(){
   if(this.ewma===null)return 0;
   const smoothed=Math.min(this.ewma,this.best*1.6);
   return clampDelay(smoothed/2);
  }
  /* Age (ms, host clock) of a guest input stamped ct on the guest clock,
     or null before any clock-aligned sample exists. */
  ageMs(ct,hostNow){
   if(this.offset===null||!Number.isFinite(ct)||!Number.isFinite(hostNow))return null;
   return Math.max(0,Math.round(hostNow-(ct-this.offset)));
  }
 }
 class InputDelayQueue{
  constructor(schedule){this.schedule=schedule||((fn,ms)=>setTimeout(fn,ms));this.pending=new Set();}
  /* Run fn after delayMs (clamped). A non-positive delay runs fn now. */
  push(delayMs,fn){
   const d=clampDelay(delayMs);
   if(d<=0){fn();return 0;}
   const token={};
   this.pending.add(token);
   this.schedule(()=>{if(this.pending.delete(token))fn();},d);
   return d;
  }
  get size(){return this.pending.size;}
  clear(){this.pending.clear();}
 }
 const CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
 function makeCode(){
  let code='';
  for(let i=0;i<6;i++)code+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];
  return code;
 }
 // Optional self-hosted PeerServer override (used by automated tests):
 // localStorage 'nightball.peerConfig' = {"host":"...","port":9000,"path":"/","secure":false}
 function peerOptions(){
  try{const cfg=JSON.parse(localStorage.getItem('nightball.peerConfig')||'null');return cfg&&cfg.host?cfg:undefined;}catch{return undefined;}
 }
 class Session{
  constructor(handlers){this.handlers=handlers;this.peer=null;this.conn=null;this.open=false;this.dead=false;}
  send(data){if(this.open&&this.conn){try{this.conn.send(data);}catch{}}}
  wireConn(conn){
   this.conn=conn;
   conn.on('open',()=>{this.open=true;this.handlers.onOpen?.();});
   conn.on('data',data=>{if(data&&typeof data==='object')this.handlers.onData?.(data);});
   const gone=()=>{if(this.dead)return;this.dead=true;this.open=false;this.handlers.onClose?.();};
   conn.on('close',gone);
   conn.on('error',gone);
   conn.on('iceStateChanged',state=>{if(state==='disconnected'||state==='closed')gone();});
  }
  destroy(){
   this.dead=true;this.open=false;
   try{this.conn?.close();}catch{}
   try{this.peer?.destroy();}catch{}
   this.conn=null;this.peer=null;
  }
 }
 async function host(code,handlers){
  await loadPeer();
  const session=new Session(handlers);
  const peer=new Peer(PREFIX+code,peerOptions());
  session.peer=peer;
  peer.on('connection',conn=>{
   if(session.conn){try{conn.close();}catch{}return;}
   session.wireConn(conn);
  });
  peer.on('error',err=>{
   if(err?.type==='unavailable-id')handlers.onError?.('taken');
   else if(!session.open)handlers.onError?.(err?.type||'error');
  });
  peer.on('open',()=>handlers.onReady?.());
  return session;
 }
 async function join(code,handlers){
  await loadPeer();
  const session=new Session(handlers);
  const peer=new Peer(peerOptions());
  session.peer=peer;
  peer.on('open',()=>{
   const conn=peer.connect(PREFIX+code,{reliable:true});
   session.wireConn(conn);
  });
  peer.on('error',err=>{
   if(err?.type==='peer-unavailable')handlers.onError?.('notfound');
   else if(!session.open)handlers.onError?.(err?.type||'error');
  });
  return session;
 }
 window.NightOnline={loadPeer,makeCode,host,join,PREFIX,LatencyEstimator,InputDelayQueue,clampDelay,LATENCY_MAX_MS,PING_INTERVAL_MS};
})();
