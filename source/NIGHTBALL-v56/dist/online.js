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
 function networkConfig(){
  let local={};try{local=JSON.parse(localStorage.getItem('nightball.peerConfig')||'{}')||{};}catch{}
  return {...(globalThis.NightOnlineConfig||{}),...local};
 }
 async function peerOptions(){
  const cfg=networkConfig(),{relayUrl,iceEndpoint,...options}=cfg;
  if(iceEndpoint){
   try{
    const url=new URL(iceEndpoint,location.href);
    if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('insecure ICE credential endpoint');
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3500);
    try{
     const res=await fetch(url,{cache:'no-store',signal:ctrl.signal});
     if(!res.ok)throw Error('ICE endpoint');
     const data=await res.json();if(Array.isArray(data.iceServers)&&data.iceServers.length)options.config={...(options.config||{}),iceServers:data.iceServers};
    }finally{clearTimeout(timer);}
   }catch{}
  }
  return options.host||options.config?options:undefined;
 }
 // The app's ordered stream carries game decisions and keyframes. A second
 // *negotiated* native channel on the same SCTP association carries only
 // disposable, independently decodable pose packets.
 const POSE_ID=62,RECOVERY_MS=15000;
 class Session{
  constructor(handlers,role,code){this.handlers=handlers;this.role=role;this.code=code;this.peer=null;this.conn=null;this.open=false;this.dead=false;this.recovering=false;this.metrics={jitter:0,missing:0,received:0,bytesSent:0,bytesReceived:0};this.relayUrl=networkConfig().relayUrl||'';}
  send(data){if(this.open&&this.conn){try{this.conn.send(data);return true;}catch{}}return false;}
  // Never enqueue periodic data behind an existing backlog.
  canSendState(){const c=this.conn;return !!(this.open&&c&&!(c.bufferSize>0)&&!((c.dataChannel||c._dc)?.bufferedAmount>32768));}
  get poseOpen(){return !!(this.open&&this.pose?.readyState==='open');}
  sendPose(data){
   if(!this.poseOpen||this.pose.bufferedAmount>4096)return false;
   try{this.pose.send(JSON.stringify(data));return true;}catch{return false;}
  }
  setupPose(conn){
   try{
    if(this.pose){this.pose.close();this.pose=null;}
    const pc=conn.peerConnection;
    if(!pc?.createDataChannel||(conn.dataChannel||conn._dc)?.id===POSE_ID)return;
    const dc=pc.createDataChannel('nightball-pose-v272',{negotiated:true,id:POSE_ID,ordered:false,maxRetransmits:0});
    this.pose=dc;this.poseConn=conn;this.lastPoseRx=null;this.lastPoseSeq=null;
    dc.onmessage=e=>{if(this.conn!==conn||!this.open||this.pose!==dc||typeof e.data!=='string'||e.data.length>65536)return;
     try{const m=JSON.parse(e.data);if(m?.t!=='pose'&&m?.t!=='derby-pose')return;
      const now=performance.now(),prev=this.lastPoseRx;
      if((!Number.isInteger(m.n)||this.lastPoseSeq==null||m.n>this.lastPoseSeq)&&prev!=null&&Number.isFinite(m.stamp)&&Number.isFinite(this.lastPoseStamp))this.metrics.jitter=this.metrics.jitter*.86+Math.abs((now-prev)-(m.stamp-this.lastPoseStamp))*.14;
      if(Number.isInteger(m.n)&&(this.lastPoseSeq==null||m.n>this.lastPoseSeq)){
       this.lastPoseRx=now;this.lastPoseStamp=m.stamp;
       if(this.lastPoseSeq!=null)this.metrics.missing+=Math.max(0,m.n-this.lastPoseSeq-1);
       this.lastPoseSeq=m.n;this.metrics.received++;
      }
      this.handlers.onData?.(m);
     }catch{}
    };
    dc.onclose=()=>{if(this.pose===dc)this.pose=null;};
   }catch{this.pose=null;}
  }
  async sampleStats(){
   const conn=this.conn,pc=conn?.peerConnection,c=conn?.dataChannel||conn?._dc;
   const result={...this.metrics,queue:(c?.bufferedAmount||0)+(this.pose?.bufferedAmount||0),fast:this.poseOpen,path:'unknown'};
   if(conn?.isRelay){const now=performance.now(),prev=this._bytes,tx=conn.tx||0,rx=conn.rx||0;result.path='WebSocket';if(prev&&now>prev.at){result.txRate=Math.max(0,(tx-prev.tx)*1000/(now-prev.at));result.rxRate=Math.max(0,(rx-prev.rx)*1000/(now-prev.at));}this._bytes={tx,rx,at:now};return result;}
   if(!pc?.getStats)return result;
   try{
    const stats=await pc.getStats();let pair,transport,tx=0,rx=0;
    stats.forEach(s=>{if(s.type==='transport'&&s.selectedCandidatePairId)transport=s;if(s.type==='candidate-pair'&&s.nominated&&s.state==='succeeded')pair=s;if(s.type==='data-channel'){tx+=s.bytesSent||0;rx+=s.bytesReceived||0;}});
    pair=transport?stats.get(transport.selectedCandidatePairId)||pair:pair;
    if(pair){
     const l=stats.get(pair.localCandidateId),r=stats.get(pair.remoteCandidateId);
     result.path=l?.candidateType==='relay'||r?.candidateType==='relay'?'TURN':l?.candidateType==='host'&&r?.candidateType==='host'?'LAN/P2P':'P2P';
     result.protocol=l?.protocol||r?.protocol||'';
     if(Number.isFinite(pair.currentRoundTripTime))result.rtt=Math.round(pair.currentRoundTripTime*1000);
    }
    const now=performance.now(),prev=this._bytes;
    if(prev&&now>prev.at){result.txRate=Math.max(0,(tx-prev.tx)*1000/(now-prev.at));result.rxRate=Math.max(0,(rx-prev.rx)*1000/(now-prev.at));}
    this._bytes={tx,rx,at:now};result.bytesSent=tx;result.bytesReceived=rx;
   }catch{}
   return result;
  }
  _clearRecovery(){clearTimeout(this.recoveryTimer);clearTimeout(this.retryTimer);clearTimeout(this.relayFallbackTimer);this.recoveryTimer=this.retryTimer=this.relayFallbackTimer=null;}
  fail(){if(this.dead)return;this.dead=true;this.open=false;this.recovering=false;this._clearRecovery();this.handlers.onClose?.();}
  interrupt(){
   if(this.dead||this.recovering)return;
   this.open=false;this.recovering=true;this.interruptedAt=performance.now();this.handlers.onInterrupt?.();if(this.dead)return;
   this.recoveryTimer=setTimeout(()=>this.fail(),RECOVERY_MS);
   if(this.role==='guest')this.retryTimer=setTimeout(()=>this.reconnect(),1600);
  }
  reconnect(){
   if(this.dead||!this.recovering||this.role!=='guest')return;
   if(this.relayUrl&&(this.conn?.isRelay||performance.now()-this.interruptedAt>4800)){
    this.startGuestRelay();this.retryTimer=setTimeout(()=>this.reconnect(),3000);return;
   }
   const peer=this.peer;
   if(peer&&!peer.destroyed&&!peer.disconnected){
    try{const prev=this.conn;this.conn=null;prev?.close();const conn=peer.connect(PREFIX+this.code,{reliable:true,metadata:{resume:this.token,protocol:272}});this.wireConn(conn);}catch{}
   }else if(peer&&!peer.destroyed&&peer.disconnected){try{peer.reconnect();}catch{}}
   this.retryTimer=setTimeout(()=>this.reconnect(),3000);
  }
  startHostRelay(){
   if(!this.relayUrl||!globalThis.NightOnlineRelay||this.dead)return;
   try{
    const c=new NightOnlineRelay(this.relayUrl,this.code,'host',this.relayHostToken??=roomToken());this.standby=c;
    c.on('open',()=>{
     if(this.dead||this.conn===c)return;
     const token=c.metadata.resume;
     // Only the same paired guest can migrate a live match to the relay.
     if(this.token&&token!==this.token){c.close();return;}
     if(this.conn){this.interrupt();const old=this.conn;this.conn=null;old.close();}
     this.token=token;this.wireConn(c);
    });
    c.on('error',()=>{if(this.conn!==c&&this.standby===c)this.standby=null;});
   }catch{}
  }
  startGuestRelay(){
   if(!this.relayUrl||!globalThis.NightOnlineRelay||this.dead||this.open)return false;
   try{
    const old=this.conn;this.conn=null;old?.close();
    const c=new NightOnlineRelay(this.relayUrl,this.code,'guest',this.token);this.usingRelay=true;this.wireConn(c);return true;
   }catch{return false;}
  }
  wireConn(conn){
   this.conn=conn;
   let opened=false;
   const current=()=>!this.dead&&this.conn===conn;
   const ready=()=>{
    if(!current())return;
    const resume=this.recovering;
    opened=true;this.open=true;this.recovering=false;this._clearRecovery();this._cancelWait?.();
    if(!this.poseOpen||this.poseConn!==conn)this.setupPose(conn);
    if(resume)this.handlers.onResume?.();else this.handlers.onOpen?.();
   };
   conn.on('open',ready);
   conn.on('data',data=>{if(current()&&this.open&&data&&typeof data==='object')this.handlers.onData?.(data);});
   const gone=()=>{if(!current())return;if(this.waitMode&&!opened&&!this.recovering&&!conn.isRelay)return;this.interrupt();};
   conn.on('close',gone);conn.on('error',gone);
   conn.on('iceStateChanged',state=>{
    if(!current())return;
    if(state==='disconnected'||state==='failed'||state==='closed')gone();
    else if((state==='connected'||state==='completed')&&this.recovering&&conn.open&&opened)ready();
   });
  }
  destroy(){
   this.dead=true;this.open=false;this.recovering=false;this._clearRecovery();this._cancelWait?.();
   try{this.pose?.close();}catch{}
   try{this.conn?.close();}catch{}
   try{this.peer?.destroy();}catch{}
   try{if(this.standby!==this.conn)this.standby?.close();}catch{}
   this.conn=null;this.peer=null;this.pose=null;
  }
 }
 function roomToken(){const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
 async function host(code,handlers){
  const session=new Session(handlers,'host',code);
  try{await loadPeer();}catch(e){if(session.relayUrl&&globalThis.NightOnlineRelay){session.startHostRelay();setTimeout(()=>{if(!session.dead)handlers.onReady?.();},0);return session;}throw e;}
  const options=await peerOptions();
  const peer=new Peer(PREFIX+code,options);
  session.peer=peer;session.startHostRelay();
  peer.on('disconnected',()=>{if(!session.dead)try{peer.reconnect();}catch{}});
  peer.on('connection',conn=>{
   const token=conn.metadata?.resume;
   if(session.dead||session.open&&session.conn?.isRelay||session.conn&&(!session.token||token!==session.token)){try{conn.close();}catch{}return;}
   if(session.conn){session.interrupt();const old=session.conn;session.conn=null;try{old.close();}catch{}}
   session.token=typeof token==='string'&&token.length===32?token:null;
   session.wireConn(conn);
  });
  peer.on('error',err=>{
   if(err?.type==='unavailable-id')handlers.onError?.('taken');
   else if(!session.open){if(session.standby){if(!session.signalReady){session.signalReady=true;handlers.onReady?.();}}else handlers.onError?.(err?.type||'error');}
  });
  peer.on('open',()=>{if(!session.signalReady){session.signalReady=true;handlers.onReady?.();}});
  return session;
 }
 async function join(code,handlers,options={}){
  const session=new Session(handlers,'guest',code);session.token=roomToken();
  try{await loadPeer();}catch(e){if(session.startGuestRelay()){session.recoveryTimer=setTimeout(()=>{if(!session.open)session.fail();},RECOVERY_MS);return session;}throw e;}
  const opts=await peerOptions();
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
   const peer=new Peer(opts);
   session.peer=peer;
   peer.on('open',()=>{
    if(session.dead||session.usingRelay){try{peer.destroy();}catch{}return;}
    const conn=peer.connect(PREFIX+code,{reliable:true,metadata:{resume:session.token,protocol:272}});
    session.wireConn(conn);
   });
   peer.on('error',err=>{
    if(session.dead||session.open||session.recovering||session.usingRelay)return;
    if(err?.type==='peer-unavailable'){
     if(!wait){if(!session.startGuestRelay())handlers.onError?.('notfound');return;}
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
  if(session.relayUrl)session.relayFallbackTimer=setTimeout(()=>{if(!session.open&&!session.dead){session._cancelWait?.();if(session.startGuestRelay()){session.recoveryTimer=setTimeout(()=>{if(!session.open)session.fail();},wait?maxWaitMs:RECOVERY_MS);}}},6500);
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
 window.NightOnline={Session,stateDelta,mergeState,loadPeer,makeCode,host,join,PREFIX,LatencyEstimator,InputDelayQueue,clampDelay,LATENCY_MAX_MS,PING_INTERVAL_MS,loadRooms,rememberRoom,forgetRoom,ROOMS_MAX,ROOMS_TTL_MS,QUICK_CHATS,quickChatText};
})();
