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
 /* ---- recent rooms (v112) ----
    Rooms this player created or joined, kept in localStorage so playing
    the same few people again is one tap instead of re-typing the code.
    Only the minimum needed to reconnect: code, own role, own club,
    opponent club when known, last-used time. Pruned by age and count. */
 const ROOMS_KEY='nightball.rooms';
 const ROOMS_MAX=8;
 const ROOMS_TTL_MS=14*24*3600*1000;
 function loadRooms(now=Date.now()){
  let list=[];
  try{const raw=JSON.parse(localStorage.getItem(ROOMS_KEY)||'[]');if(Array.isArray(raw))list=raw;}catch{}
  return list.filter(r=>r&&typeof r.code==='string'&&(r.role==='host'||r.role==='guest')&&Number.isFinite(r.at)&&(now-r.at)<ROOMS_TTL_MS).slice(0,ROOMS_MAX);
 }
 function saveRooms(list){try{localStorage.setItem(ROOMS_KEY,JSON.stringify(list.slice(0,ROOMS_MAX)));}catch{}}
 function rememberRoom(entry,now=Date.now()){
  if(!entry||typeof entry.code!=='string'||!(entry.role==='host'||entry.role==='guest'))return loadRooms(now);
  const code=entry.code.toUpperCase();
  const list=loadRooms(now).filter(r=>!(r.code===code&&r.role===entry.role));
  list.unshift({code,role:entry.role,club:entry.club||null,opp:entry.opp||null,at:now});
  saveRooms(list);return list;
 }
 function forgetRoom(code,role,now=Date.now()){
  const list=loadRooms(now).filter(r=>!(r.code===String(code).toUpperCase()&&r.role===role));
  saveRooms(list);return list;
 }
 // Optional self-hosted PeerServer override (used by automated tests):
 // localStorage 'nightball.peerConfig' = {"host":"...","port":9000,"path":"/","secure":false}
 function peerOptions(){
  try{const cfg=JSON.parse(localStorage.getItem('nightball.peerConfig')||'null');return cfg&&cfg.host?cfg:undefined;}catch{return undefined;}
 }
 class Session{
  constructor(handlers){this.handlers=handlers;this.peer=null;this.conn=null;this.open=false;this.dead=false;}
  send(data){if(this.open&&this.conn){try{this.conn.send(data);return true;}catch{}}return false;}
  // Do not queue obsolete periodic snapshots behind reliable game events.
  canSendState(){const c=this.conn;return !!(this.open&&c&&!(c.bufferSize>0)&&!((c.dataChannel||c._dc)?.bufferedAmount>32768));}
  wireConn(conn){
   this.conn=conn;
   let opened=false;
   conn.on('open',()=>{opened=true;this.open=true;this._cancelWait?.();this.handlers.onOpen?.();});
   conn.on('data',data=>{if(data&&typeof data==='object')this.handlers.onData?.(data);});
   // While a guest session is waiting for the host to appear (v112), a
   // failed attempt's connection may report error/close before it ever
   // opened: that is the retry loop's business, not a disconnect.
   const gone=()=>{if(this.dead)return;if(this.waitMode&&!opened)return;this.dead=true;this.open=false;this.handlers.onClose?.();};
   conn.on('close',gone);
   conn.on('error',gone);
   conn.on('iceStateChanged',state=>{if(state==='disconnected'||state==='closed')gone();});
  }
  destroy(){
   this.dead=true;this.open=false;
   this._cancelWait?.();
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
 async function join(code,handlers,options={}){
  await loadPeer();
  const session=new Session(handlers);
  /* Guest waiting (v112): when the host has not opened the room yet, the
     broker answers 'peer-unavailable'. With wait enabled, retry on an
     interval until the host appears, the wait budget runs out (then the
     usual 'notfound' error fires), or the session is destroyed, which is
     how the guest cancels. Cadence and budget stay gentle: the broker is
     a free shared service. Each attempt registers a fresh peer; the
     failed one is destroyed. */
  const wait=!!options.wait;
  const retryMs=Math.max(250,Number(options.retryMs)||3000);
  const maxWaitMs=Number.isFinite(options.maxWaitMs)?options.maxWaitMs:120000;
  let timer=null,waitStartedAt=0,attempts=0;
  session.waitMode=wait;
  session._cancelWait=()=>{if(timer){clearTimeout(timer);timer=null;}};
  const attempt=()=>{
   if(session.dead)return;
   const peer=new Peer(peerOptions());
   session.peer=peer;
   peer.on('open',()=>{
    if(session.dead){try{peer.destroy();}catch{}return;}
    const conn=peer.connect(PREFIX+code,{reliable:true});
    session.wireConn(conn);
   });
   peer.on('error',err=>{
    if(session.dead||session.open)return;
    if(err?.type==='peer-unavailable'){
     if(!wait){handlers.onError?.('notfound');return;}
     if(!waitStartedAt)waitStartedAt=Date.now();
     if(Date.now()-waitStartedAt<maxWaitMs){
      attempts++;
      try{peer.destroy();}catch{}
      if(session.peer===peer)session.peer=null;
      handlers.onWaiting?.(attempts);
      timer=setTimeout(attempt,retryMs);
     }else handlers.onError?.('notfound');
     return;
    }
    handlers.onError?.(err?.type||'error');
   });
  };
  attempt();
  return session;
 }
 /* ---- quick chat (v114): preset phrases only, sent by index ----
    Free text is deliberately not supported: the phrases are fixed, so the
    receiver validates the index against this list and renders its own
    copy of the text. */
 const QUICK_CHATS=['よろしく！','ナイスプレイ！','すごい！','惜しい！','ありがとう','ごめん！','もう一球！','いける！','あぶない！','おつかれさま！'];
 function quickChatText(index){
  if(typeof index!=='number'&&typeof index!=='string')return null;
  const n=Number(index);
  return Number.isInteger(n)&&n>=0&&n<QUICK_CHATS.length?QUICK_CHATS[n]:null;
 }
 // Reliable ordered delta stream: only changed metadata is sent; the
 // current field pose and clocks are independent of the metadata cache.
 const LIVE_STATE_KEYS=new Set(['pt','field','fsq','swingAge','stamp','seq']);
 function stateDelta(state,previous,full=false){
  const patch={},next={};
  for(const [k,v] of Object.entries(state)){
   if(LIVE_STATE_KEYS.has(k)){patch[k]=v;continue;}
   const encoded=JSON.stringify(v??null);next[k]=encoded;
   if(full||previous?.[k]!==encoded)patch[k]=JSON.parse(encoded);
  }
  return {patch,next};
 }
 function mergeState(previous,patch,full){
  if(!full&&!previous)return null;
  return {...(full?{}:previous),...patch};
 }
 window.NightOnline={stateDelta,mergeState,loadPeer,makeCode,host,join,PREFIX,LatencyEstimator,InputDelayQueue,clampDelay,LATENCY_MAX_MS,PING_INTERVAL_MS,loadRooms,rememberRoom,forgetRoom,ROOMS_MAX,ROOMS_TTL_MS,QUICK_CHATS,quickChatText};
})();
