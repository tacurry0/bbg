importScripts('./online-codec.js?v=272');
self.onmessage=e=>{
 const {id,op,clip}=e.data||{};
 try{self.postMessage({id,value:op==='pack'?NightOnlineCodec.packReplay(clip):NightOnlineCodec.unpackReplay(clip)});}
 catch{self.postMessage({id,error:true});}
};
