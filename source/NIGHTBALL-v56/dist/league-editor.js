/* Custom league editor (v107): user-built pennant leagues stored in
   localStorage. A league definition is a plain object
   {id, name, clubIds, gamesPerOpponent, dh, playoffs} whose clubs are drawn
   from the existing CPBL/NPB/KBO pool. Validation and the club registry live
   in pennant.js (NightPennant.validateCustomLeague / registerCustomLeague),
   so a registered custom league resolves through NightPennant.clubsFor and
   the whole pennant engine — schedule, standings, playoffs, offseason —
   treats it exactly like a built-in league. This module only owns
   persistence, mirroring stadium-editor.js / nightball.customParks. */
(()=>{
'use strict';
const KEY='nightball.customLeagues';
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function loadDefs(storage){
 const store=storageOr(storage);if(!store)return [];
 try{const raw=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(raw)?raw.filter(d=>d&&typeof d==='object'&&d.id):[];}catch{return [];}
}
function saveDefs(defs,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(defs));return true;}catch{return false;}
}
function validate(def){
 if(typeof NightPennant==='undefined')return {ok:false,errors:['ペナント基盤が読み込まれていません'],def:null};
 return NightPennant.validateCustomLeague(def);
}
// (Re)register every stored definition with the pennant engine. Invalid
// stored entries are skipped (validateCustomLeague reports why via list()).
function register(storage){
 if(typeof NightPennant==='undefined')return [];
 const registered=[];
 for(const def of loadDefs(storage)){const clean=NightPennant.registerCustomLeague(def);if(clean)registered.push(clean);}
 return registered;
}
function get(id,storage){
 const def=loadDefs(storage).find(d=>d.id===id);
 if(!def)return null;
 const v=validate(def);
 return v.ok?v.def:def;
}
function upsert(def,storage){
 const specs=loadDefs(storage);
 const id=def.id&&String(def.id).startsWith('custom-')?String(def.id):'custom-league-'+Date.now().toString(36)+'-'+specs.length;
 const v=validate({...def,id});
 if(!v.ok)return null;
 const at=specs.findIndex(s=>s.id===id);if(at>=0)specs[at]=v.def;else specs.push(v.def);
 saveDefs(specs,storage);register(storage);
 return v.def;
}
function remove(id,storage){
 const specs=loadDefs(storage).filter(d=>d.id!==id);
 saveDefs(specs,storage);
 if(typeof NightPennant!=='undefined')NightPennant.unregisterCustomLeague(id);
 return specs;
}
// Season shape helpers for the editor UI: with n clubs and g games against
// every opponent, each club plays g*(n-1) games over g*(n-1) rounds.
const totalGamesPerClub=def=>def.gamesPerOpponent*(def.clubIds.length-1);
const totalFixtures=def=>def.gamesPerOpponent*def.clubIds.length*(def.clubIds.length-1)/2;
const api={KEY,loadDefs,saveDefs,register,upsert,remove,get,validate,totalGamesPerClub,totalFixtures,
 list:storage=>loadDefs(storage).map(d=>{const v=validate(d);return v.ok?v.def:d;})};
if(typeof window!=='undefined')window.NightLeague=api;
if(typeof globalThis!=='undefined')globalThis.NightLeague=api;
register();
})();
