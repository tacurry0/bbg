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
 window.NightOnline={loadPeer,makeCode,host,join,PREFIX};
})();
