/* Local, synchronous persistence for multi-decade rosters. */
(()=>{
 'use strict';
 const encode=(value)=>{
  const bytes=new TextEncoder().encode(JSON.stringify(value)),dict=new Map();
  let previous=bytes[0],next=256,chunk=[],binary='';
  const emit=code=>{
   chunk.push(code>>8,code&255);
   if(chunk.length>=8192){binary+=String.fromCharCode(...chunk);chunk=[];}
  };
  for(let i=1;i<bytes.length;i++){
   const byte=bytes[i],key=previous*256+byte,code=dict.get(key);
   if(code!==undefined){previous=code;continue;}
   emit(previous);
   if(next<65535)dict.set(key,next++);
   else{emit(65535);dict.clear();next=256;}
   previous=byte;
  }
  if(bytes.length)emit(previous);
  return 'lz1:'+btoa(binary+String.fromCharCode(...chunk));
 };
 const decode=(packed)=>{
  if(!packed?.startsWith('lz1:'))return JSON.parse(packed||'null');
  const binary=atob(packed.slice(4)),head=new Uint16Array(65536),tail=new Uint8Array(65536);
  let next=256,previous=-1,length=0;
  let output=new Uint8Array(Math.max(1024,binary.length*4));
  const push=byte=>{
   if(length===output.length){const bigger=new Uint8Array(length*2);bigger.set(output);output=bigger;}
   output[length++]=byte;
  };
  const stack=[];
  for(let i=0;i<binary.length;i+=2){
   const code=binary.charCodeAt(i)*256+binary.charCodeAt(i+1);
   if(code===65535){next=256;previous=-1;continue;}
   if(code>next||code===next&&previous<0)throw Error('Invalid career save');
   let cursor=code===next?previous:code;
   while(cursor>=256){stack.push(tail[cursor]);cursor=head[cursor];}
   const first=cursor;push(first);
   while(stack.length)push(stack.pop());
   if(code===next)push(first);
   if(previous>=0&&next<65535){head[next]=previous;tail[next]=first;next++;}
   previous=code;
  }
  return JSON.parse(new TextDecoder().decode(output.subarray(0,length)));
 };
 window.NightCareerWorldSave={encode,decode};
})();
