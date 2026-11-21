/* Three independent world-career saves. The original single-save key remains
   an active mirror for compatibility and is copied to slot 1 before migration. */
(()=>{
 'use strict';
 const base=NightCareerWorld.key, registryKey=base+'.slots.v1', capacity=3;
 const key=id=>base+'.slot.'+id;
 const codec=NightCareerWorldSave;
 const valid=encoded=>{
  if(!encoded)return null;
  try{return NightCareerWorld.restore(codec.decode(encoded));}catch{return null;}
 };
 const info=(id,w)=>({id,name:w.name,country:w.country,stage:w.stage,day:w.day,
  yearLabel:w.yearLabel,club:w.club||null,updated:new Date().toISOString()});
 const read=()=>{
  const text=localStorage.getItem(registryKey);
  if(text===null)return {version:1,active:null,slots:[]};
  let raw;
  try{raw=JSON.parse(text);}catch{throw Error('保存枠の管理情報が破損しています');}
  if(!raw)throw Error('保存枠の管理情報を読み込めません');
  if(raw.version!==1||!Array.isArray(raw.slots)||raw.slots.length>capacity||
     !raw.slots.every(s=>Number.isInteger(s.id)&&s.id>=0&&s.id<capacity)||
     new Set(raw.slots.map(s=>s.id)).size!==raw.slots.length)throw Error('保存枠の管理情報を読み込めません');
  return raw;
 };
 function migrate(){
  const raw=localStorage.getItem(registryKey);
  if(raw!==null)return read();
  const legacy=localStorage.getItem(base),world=valid(legacy);
  const meta={version:1,active:world?0:null,slots:world?[info(0,world)]:[]};
  if(world){
   // Back up the complete existing save before writing any registry metadata.
   localStorage.setItem(key(0),legacy);
  }
  localStorage.setItem(registryKey,JSON.stringify(meta));
  return meta;
 }
 function list(){return migrate();}
 function load(){
  const m=migrate();
  if(m.active===null)return null;
  if(!m.slots.some(s=>s.id===m.active))return null;
  // A mismatched active mirror is ignored (for example after an interrupted switch).
  const mirror=valid(localStorage.getItem(base)),archived=valid(localStorage.getItem(key(m.active)));
  return mirror&&archived&&mirror.seed!==archived.seed?archived:mirror||archived;
 }
 function save(w){
  if(!w)return false;
  try{
   const m=migrate(),id=m.active;
   if(id===null||!m.slots.some(s=>s.id===id))return false;
   const encoded=codec.encode(w);
   // Slot snapshot is committed first; the legacy save is never the sole copy.
   localStorage.setItem(key(id),encoded);
   localStorage.setItem(base,encoded);
   const index=m.slots.findIndex(s=>s.id===id);
   m.slots[index]=info(id,w);
   localStorage.setItem(registryKey,JSON.stringify(m));
   return true;
  }catch{return false;}
 }
 function create(w,requested=null){
  try{
   const m=migrate();
   const wanted=Number(requested);
   const id=requested!==null&&Number.isInteger(wanted)&&wanted>=0&&wanted<capacity&&!m.slots.some(s=>s.id===wanted)?wanted:
    Array.from({length:capacity},(_,i)=>i).find(i=>!m.slots.some(s=>s.id===i));
   if(id===undefined)return false;
   const encoded=codec.encode(w);
   // No existing slot or archived player is ever overwritten.
   localStorage.setItem(key(id),encoded);
   localStorage.setItem(base,encoded);
   m.slots.push(info(id,w));m.active=id;
   localStorage.setItem(registryKey,JSON.stringify(m));
   return true;
  }catch{return false;}
 }
 function open(id){
  try{
   const m=migrate();
   id=Number(id);
   if(!Number.isInteger(id)||!m.slots.some(s=>s.id===id))return null;
   const encoded=localStorage.getItem(key(id)),world=valid(encoded);
   if(!world)return null;
   if(id!==m.active){
    // The current slot was saved before this method by the caller.
    localStorage.setItem(base,encoded);
    m.active=id;
    localStorage.setItem(registryKey,JSON.stringify(m));
   }
   return world;
  }catch{return null;}
 }
 window.NightCareerWorldSlots={capacity,key,registryKey,list,load,save,create,open};
})();