/* Creation share codes (v135, checker item "creation-share-codes"):
   custom parks and custom leagues can be exported as a single text code
   and imported on another device, so creations can be shared with
   friends. (There is no custom-team editor/store in the game, so teams
   are out of scope; the save-data backup in settings covers whole-device
   data and is a different feature.)

   Code format:  NB1.PARK.<base64url>  /  NB1.LEAGUE.<base64url>
   The payload is UTF-8 JSON {v:1, kind:'park'|'league', data:{...}}.
   The "NB1" prefix carries the format version and the tag repeats the
   kind, so a code pasted into the wrong place — or written by a newer
   version — is rejected with a message instead of being half-applied.

   Safety: decode() never throws. Import always goes through the
   editors' own registration paths (NightStadium.upsert, which clamps
   via clampSpec, and NightLeague.upsert, which validates via
   NightPennant.validateCustomLeague), so a shared code can never
   smuggle in values the editor itself would reject. The stored id is
   NOT part of the code: an import always creates a fresh local entry,
   and when the name collides with an existing creation the import is
   added under a suffixed name ("名前 (2)") instead of overwriting. */
(()=>{
'use strict';
const VERSION=1;
const MAX_CODE_LENGTH=20000;
const PARK_FIELDS=['left','leftCenter','center','rightCenter','right','wallHeight'];
const TAGS={park:'PARK',league:'LEAGUE'};
// ---- base64url of UTF-8 text (browser + Node, no dependencies) ----
function encodeText(text){
 const bytes=new TextEncoder().encode(text);
 let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
 return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeText(b64){
 const bin=atob(b64.replace(/-/g,'+').replace(/_/g,'/'));
 const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
function encode(kind,data){
 return `NB${VERSION}.${TAGS[kind]}.${encodeText(JSON.stringify({v:VERSION,kind,data}))}`;
}
function fail(error){return {ok:false,error};}
// Parse and structurally validate a code. Returns
// {ok:true, kind, data} or {ok:false, error} — never throws.
function decode(code){
 if(typeof code!=='string')return fail('コードが入力されていません');
 const text=code.trim();
 if(!text)return fail('コードが入力されていません');
 if(text.length>MAX_CODE_LENGTH)return fail('コードが長すぎます');
 const parts=text.split('.');
 if(parts.length!==3)return fail('共有コードの形式ではありません');
 const versionMatch=/^NB(\d+)$/.exec(parts[0]);
 if(!versionMatch)return fail('共有コードの形式ではありません');
 if(Number(versionMatch[1])!==VERSION)return fail(`対応していないバージョンのコードです（NB${versionMatch[1]}）`);
 const kind=Object.keys(TAGS).find(k=>TAGS[k]===parts[1]);
 if(!kind)return fail('共有コードの種別が分かりません');
 if(!/^[A-Za-z0-9_-]+$/.test(parts[2]))return fail('コードが壊れています');
 let payload;
 try{payload=JSON.parse(decodeText(parts[2]));}catch{return fail('コードが壊れています');}
 if(!payload||typeof payload!=='object')return fail('コードが壊れています');
 if(payload.v!==VERSION)return fail(`対応していないバージョンのコードです（v${payload.v}）`);
 if(payload.kind!==kind)return fail('コードの種別が一致しません');
 const data=payload.data;
 if(!data||typeof data!=='object'||Array.isArray(data))return fail('コードにデータが含まれていません');
 if(typeof data.name!=='string'||!data.name.trim())return fail('必須項目（名前）が不足しています');
 if(kind==='park'){
  for(const field of PARK_FIELDS)if(!Number.isFinite(Number(data[field]))||data[field]===null||data[field]==='')return fail(`必須項目（${field}）が不足しています`);
 }else{
  if(!Array.isArray(data.clubIds)||!data.clubIds.length||data.clubIds.some(c=>typeof c!=='string'))return fail('必須項目（参加球団）が不足しています');
  if(!Number.isInteger(data.gamesPerOpponent))return fail('必須項目（対戦数）が不足しています');
 }
 return {ok:true,kind,data};
}
// The payload for one stored creation: only the editor-owned fields,
// never the local id (an import must mint its own).
function parkData(spec){
 if(typeof NightStadium!=='undefined')return NightStadium.clampSpec(spec);
 const out={name:String(spec.name??'')};
 for(const field of PARK_FIELDS)out[field]=spec[field];
 return out;
}
function leagueData(def){
 return {name:String(def.name??''),clubIds:[...(def.clubIds||[])],gamesPerOpponent:def.gamesPerOpponent,dh:def.dh!==false,playoffs:def.playoffs!==false};
}
function encodePark(spec){return spec?encode('park',parkData(spec)):null;}
function encodeLeague(def){return def?encode('league',leagueData(def)):null;}
function exportPark(id,storage){
 if(typeof NightStadium==='undefined')return null;
 const spec=NightStadium.loadSpecs(storage).find(s=>s.id===id);
 return spec?encodePark(spec):null;
}
function exportLeague(id,storage){
 if(typeof NightLeague==='undefined')return null;
 const def=NightLeague.loadDefs(storage).find(d=>d.id===id);
 return def?encodeLeague(def):null;
}
// "名前" -> "名前 (2)" -> "名前 (3)"… until free, respecting the
// editors' 24-character name limit so the suffix is never cut off.
function uniqueName(base,taken){
 const clean=String(base??'').trim()||'名称未設定';
 if(!taken.has(clean))return clean;
 for(let n=2;n<1000;n++){
  const suffix=` (${n})`;
  const candidate=clean.slice(0,24-suffix.length)+suffix;
  if(!taken.has(candidate))return candidate;
 }
 return clean.slice(0,18)+' ('+Date.now().toString(36)+')';
}
// A fresh local id for an import. The editors' own fallback ids are
// Date.now()+store-length based, so an export and an import landing in
// the same millisecond could mint the SAME id — and upsert-by-id would
// then silently replace the original. Imports therefore always carry
// an explicit random id that is checked against the target store.
function freshId(existingIds){
 let id='';
 do{id='custom-share-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}while(existingIds.has(id));
 return id;
}
// Import a code as a NEW local creation. Returns
// {ok:true, kind, item, renamed} or {ok:false, error} — never throws,
// never overwrites an existing entry.
function importCode(code,storage,expectedKind){
 const dec=decode(code);
 if(!dec.ok)return dec;
 if(expectedKind&&dec.kind!==expectedKind)return fail(expectedKind==='park'?'リーグのコードです。リーグエディタから読み込んでください':'球場のコードです。球場エディタから読み込んでください');
 try{
  if(dec.kind==='park'){
   if(typeof NightStadium==='undefined')return fail('球場エディタが読み込まれていません');
   const specs=NightStadium.loadSpecs(storage);
   const taken=new Set(specs.map(s=>NightStadium.clampSpec(s).name));
   const name=uniqueName(NightStadium.clampSpec(dec.data).name,taken);
   const park=NightStadium.upsert({id:freshId(new Set(specs.map(s=>s.id))),...parkData(dec.data),name},storage);
   if(!park)return fail('球場を保存できませんでした');
   return {ok:true,kind:'park',item:park,renamed:name!==NightStadium.clampSpec(dec.data).name};
  }
  if(typeof NightLeague==='undefined')return fail('リーグエディタが読み込まれていません');
  const probe={id:'custom-share-import',...leagueData(dec.data)};
  const v=NightLeague.validate(probe);
  if(!v.ok)return fail('読み込めません：'+v.errors.join(' / '));
  const defs=NightLeague.loadDefs(storage);
  const taken=new Set(defs.map(d=>String(d.name??'')));
  const name=uniqueName(v.def.name,taken);
  const saved=NightLeague.upsert({...v.def,name,id:freshId(new Set(defs.map(d=>d.id)))},storage);
  if(!saved)return fail('リーグを保存できませんでした');
  return {ok:true,kind:'league',item:saved,renamed:name!==v.def.name};
 }catch{return fail('読み込み中にエラーが発生しました');}
}
const api={VERSION,MAX_CODE_LENGTH,PARK_FIELDS,encode,decode,parkData,leagueData,encodePark,encodeLeague,exportPark,exportLeague,uniqueName,importCode};
if(typeof window!=='undefined')window.NightShare=api;
if(typeof globalThis!=='undefined')globalThis.NightShare=api;
})();
