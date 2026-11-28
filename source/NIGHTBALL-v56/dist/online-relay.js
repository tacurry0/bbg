/* Optional WebSocket transport for networks where WebRTC cannot connect.
   It relays exactly the same authoritative messages, not game logic. */
(()=>{
 class RelayConnection{
  constructor(url,code,role,token){
   this.role=role;this.open=false;this.isRelay=true;this.listeners=new Map();this.metadata={};
   const endpoint=new URL(url,location.href);
   if(endpoint.protocol!=='wss:'&&!(endpoint.protocol==='ws:'&&['localhost','127.0.0.1'].includes(endpoint.hostname)))throw Error('invalid relay URL');
   endpoint.searchParams.set('room',code);endpoint.searchParams.set('role',role);endpoint.searchParams.set('token',token);
   this.socket=new WebSocket(endpoint);this.dataChannel={get bufferedAmount(){return 0;}};
   Object.defineProperty(this.dataChannel,'bufferedAmount',{get:()=>this.socket.bufferedAmount||0});
   this.tx=0;this.rx=0;
   this.socket.onmessage=e=>{
    if(typeof e.data!=='string'||e.data.length>524288)return;
    try{const m=JSON.parse(e.data);
     if(m.relay==='connected'){
      this.metadata.resume=m.peerToken;const was=this.open;this.open=true;if(!was)this.emit('open');
     }else if(m.relay==='waiting'){const was=this.open;this.open=false;if(was)this.emit('close');}
     else if(m.relay==='data'&&this.open&&m.data&&typeof m.data==='object'){this.rx+=e.data.length;this.emit('data',m.data);}
    }catch{}
   };
   this.socket.onclose=()=>{this.open=false;this.emit('close');};
   this.socket.onerror=()=>{this.open=false;this.emit('error');};
  }
  on(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);if(type==='open'&&this.open)queueMicrotask(fn);return this;}
  emit(type,arg){for(const fn of [...(this.listeners.get(type)||[])])fn(arg);}
  get bufferSize(){return this.socket.bufferedAmount||0;}
  send(data){if(!this.open||this.socket.readyState!==WebSocket.OPEN)throw Error('relay closed');const s=JSON.stringify({relay:'data',data});if(s.length>524288)throw Error('relay message too large');this.socket.send(s);this.tx+=s.length;}
  close(){this.open=false;try{this.socket.close();}catch{}}
 }
 globalThis.NightOnlineRelay=RelayConnection;
})();
