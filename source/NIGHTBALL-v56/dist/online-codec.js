/* v272: compact independently decodable live snapshots.
   Each delta refers only to the reliable per-play keyframe, never another
   unreliable packet. Replay deltas are sequential on the reliable stream. */
(()=>{
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const object=v=>v!==null&&typeof v==='object';
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 const sameType=(a,b)=>object(a)&&object(b)&&Array.isArray(a)===Array.isArray(b);
 const unsafe=k=>k==='__proto__'||k==='constructor'||k==='prototype';
 function delta(base,value){
  if(value===base||value===undefined&&base===undefined)return undefined;
  if(value===undefined)return ['d'];
  if(!object(value))return value;
  if(!sameType(base,value)||Array.isArray(value)&&value.length!==base.length)return ['v',value];
  const keys=Object.keys(base),out=['p'];
  for(let i=0;i<keys.length;i++){
   const k=keys[i],change=delta(base[k],own(value,k)?value[k]:undefined);
   if(change!==undefined)out.push(i,change);
  }
  for(const k of Object.keys(value))if(!own(base,k)&&value[k]!==undefined&&!unsafe(k))out.push(k,object(value[k])?['v',value[k]]:value[k]);
  return out.length>1?out:undefined;
 }
 function apply(base,change){
  if(change===undefined)return base;
  if(!Array.isArray(change))return change;
  if(change[0]==='v')return change[1];
  if(change[0]==='d')return undefined;
  if(change[0]!=='p'||!object(base)||change.length%2!==1)throw Error('invalid field delta');
  const keys=Object.keys(base),out=Array.isArray(base)?base.slice():{...base};
  for(let i=1;i<change.length;i+=2){
   const key=typeof change[i]==='number'?keys[change[i]]:change[i];
   if(typeof key!=='string'||unsafe(key))throw Error('invalid field key');
   const v=apply(base[key],change[i+1]);
   if(v===undefined)delete out[key];else out[key]=v;
  }
  return out;
 }
 // null is a legitimate value in a patch; an empty p is the unchanged sentinel.
 const encode=(base,value)=>{const d=delta(base,value);return d===undefined?['p']:d;};
 const decode=(base,change)=>Array.isArray(change)&&change.length===1&&change[0]==='p'?base:apply(base,change);
 function packReplay(clip){
  if(!clip?.frames?.length)return clip;
  const frames=clip.frames,base=clone(frames[0]),deltas=[];let prev=base;
  for(let i=1;i<frames.length;i++){const frame=clone(frames[i]);deltas.push(encode(prev,frame));prev=frame;}
  const {frames:unused,...meta}=clip;
  return {...meta,codec:1,base,deltas};
 }
 function unpackReplay(wire){
  if(wire?.codec!==1)return wire;
  if(!wire.base||!Array.isArray(wire.deltas)||wire.deltas.length>80)throw Error('invalid replay');
  const frames=[wire.base];
  for(const d of wire.deltas)frames.push(decode(frames.at(-1),d));
  const {codec,base,deltas,...meta}=wire;return {...meta,frames};
 }
 // Compact live ticks with bounded precision only for visual coordinates.
 // The host keeps full precision for physics, catches, timing and challenges.
 function fieldWire(field){
  if(!field)return null;
  const quant=(n,scale)=>typeof n==='number'&&Number.isFinite(n)?Math.round(n*scale)/scale:n;
  const pos=p=>{const q={...p};for(const k of ['x','y','z'])if(k in q)q[k]=quant(q[k],100);return q;};
  return {...field,trail:undefined,manual:field.manual?{...field.manual,selection:undefined,closeCall:undefined}:field.manual,ball:pos(field.ball),fielders:field.fielders.map(pos),runners:field.runners.map(pos)};
 }
 // Worker is optional (older PWA/browser); codec always has a main-thread fallback.
 let worker=null,serial=0;const pending=new Map();
 function replayAsync(op,clip){
  const sync=()=>op==='pack'?packReplay(clip):unpackReplay(clip);
  if(typeof Worker!=='function')return Promise.resolve().then(sync);
  try{
   if(!worker){
    worker=new Worker('./online-codec-worker.js?v=272');
    worker.onmessage=e=>{const item=pending.get(e.data?.id);if(!item)return;pending.delete(e.data.id);clearTimeout(item.timer);if(e.data.error)item.fallback();else item.resolve(e.data.value);};
    worker.onerror=()=>{worker?.terminate();worker=null;for(const item of pending.values()){clearTimeout(item.timer);item.fallback();}pending.clear();};
   }
   return new Promise((resolve,reject)=>{
    const id=++serial,fallback=()=>{try{resolve(sync());}catch(e){reject(e);}};
    const timer=setTimeout(()=>{if(pending.delete(id))fallback();},1800);
    pending.set(id,{resolve,fallback,timer});
    try{worker.postMessage({id,op,clip});}catch{pending.delete(id);clearTimeout(timer);fallback();}
   });
  }catch{return Promise.resolve().then(sync);}
 }
 globalThis.NightOnlineCodec={clone,delta,apply,encode,decode,fieldWire,packReplay,unpackReplay,replayAsync};
})();
