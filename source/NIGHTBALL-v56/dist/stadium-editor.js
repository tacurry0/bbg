/* Custom stadium editor (v107): user-built parks stored in localStorage.
   A custom park is a plain park object in the exact shape NightPlayers.parks
   already uses, so NightPlayers.wallDistance / fenceHeight, the 2D renderer
   (which samples wallDistance) and the 3D wall builder (which also samples
   wallDistance / fenceHeight) all consume it unchanged. The generic 3D
   stands/board come from a fixed template below; only the fence geometry
   follows the custom dimensions. */
(()=>{
'use strict';
const KEY='nightball.customParks';
// Clamp ranges keep every custom park inside the envelope the engine and
// renderers already handle: the smallest built-in park is the 70 m school
// yard and the deepest built-in centre field is 125 m (Jamsil), while the
// tallest built-in wall is 5 m (Yokohama). The ranges below stay near that
// envelope while still allowing clearly shallow / deep custom parks.
const LIMITS={
 left:[80,130],leftCenter:[85,145],center:[95,160],rightCenter:[85,145],right:[80,130],wallHeight:[1,12]
};
const FIELDS=Object.keys(LIMITS);
const num=(value,fallback)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const clampField=(field,value,fallback)=>{const [lo,hi]=LIMITS[field];return Math.round(Math.max(lo,Math.min(hi,num(value,fallback)))*10)/10;};
function clampSpec(spec={}){
 const base={left:100,leftCenter:110,center:120,rightCenter:110,right:100,wallHeight:2.8};
 const out={};
 for(const field of FIELDS)out[field]=clampField(field,spec[field],base[field]);
 const name=String(spec.name??'').replace(/[<>&"']/g,'').trim().slice(0,24);
 out.name=name||'マイスタジアム';
 return out;
}
// Visual template for the generic 3D presentation (stands, board, colours).
// Dimensions are NOT part of the template: they come from the spec.
const TEMPLATE={theme:'night',wind:0,turf:0x5d8a4a,turfNear:0x6b9a52,turfNight:0x91aa53,clay:0xc28770,track:0x9e5d4a,foulTrack:0xb8775b,trackWidth:3.5,mowing:[.5,.55],seats:0x325e71,wall:0x264f54,rail:0xe5c568,board:[-10,16,143,33,12],stands:[[-1.12,-.21,.8],[.20,1.12,.8]]};
function makePark(spec,id){
 const s=clampSpec(spec);
 const feet=m=>Math.round(m*3.28084);
 return {id:String(id),custom:true,alleysVerified:true,
  name:s.name,left:s.left,leftCenter:s.leftCenter,center:s.center,rightCenter:s.rightCenter,right:s.right,
  corner:Math.min(s.left,s.right),wallHeight:s.wallHeight,
  leftFeet:feet(s.left),centerFeet:feet(s.center),rightFeet:feet(s.right),
  ...structuredClone(TEMPLATE)};
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function loadSpecs(storage){
 const store=storageOr(storage);if(!store)return [];
 try{const raw=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(raw)?raw.filter(s=>s&&typeof s==='object'&&s.id):[];}catch{return [];}
}
function saveSpecs(specs,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(specs));return true;}catch{return false;}
}
// (Re)register every stored custom park in NightPlayers.parks. Existing
// custom entries are replaced in place so a game or renderer holding the
// parks array sees the edited dimensions under the same id.
function register(storage){
 if(typeof NightPlayers==='undefined'||!Array.isArray(NightPlayers.parks))return [];
 const specs=loadSpecs(storage),parks=specs.map(s=>makePark(s,s.id)),ids=new Set(parks.map(p=>p.id));
 for(let i=NightPlayers.parks.length-1;i>=0;i--)if(NightPlayers.parks[i].custom&&!ids.has(NightPlayers.parks[i].id))NightPlayers.parks.splice(i,1);
 for(const park of parks){const at=NightPlayers.parks.findIndex(p=>p.id===park.id);if(at>=0)NightPlayers.parks[at]=park;else NightPlayers.parks.push(park);}
 return parks;
}
function upsert(spec,storage){
 const specs=loadSpecs(storage);
 const id=spec.id&&String(spec.id).startsWith('custom-')?String(spec.id):'custom-'+Date.now().toString(36)+'-'+specs.length;
 const clean={id,...clampSpec(spec)};
 const at=specs.findIndex(s=>s.id===id);if(at>=0)specs[at]=clean;else specs.push(clean);
 saveSpecs(specs,storage);register(storage);
 return makePark(clean,id);
}
function remove(id,storage){
 const specs=loadSpecs(storage).filter(s=>s.id!==id);
 saveSpecs(specs,storage);register(storage);
 return specs;
}
const api={KEY,LIMITS,clampSpec,makePark,loadSpecs,saveSpecs,register,upsert,remove,
 list:storage=>loadSpecs(storage).map(s=>makePark(s,s.id))};
if(typeof window!=='undefined')window.NightStadium=api;
if(typeof globalThis!=='undefined')globalThis.NightStadium=api;
register();
})();
