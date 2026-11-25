/* Match setup presets (v130): named snapshots of the regular versus-match
   setup, stored in localStorage under 'nightball.matchPresets'.
   A preset captures everything the versus setup flow uses: own club,
   opponent club, home/away, innings, park, lighting, starting pitcher
   (index into the own club's rotation, as kept in matchLineups), the
   difficulty preset plus the custom CPU sliders, and the match-affecting
   play options (field/defense speed, manual running, batting assist,
   tiebreak). v153 (checker item "preset-variant-gap") adds the keys that
   arrived after v130: the random roster toggle (v132, settings key
   randomRoster) and the four variant rules (v133, settings keys
   variantFullCount / variantMetalBat / variantNoBreaking /
   variantTwoOuts). v180 adds the fifth variant rule, the low-rebound
   bat (settings key variantLowReboundBat), to the same optional set.
   Applying a preset only writes those values back into
   the live settings — it never starts a match by itself.
   sanitizeValues() is the safety net for stale presets: any entry whose
   referent no longer exists (a deleted custom park, a removed club, an
   unknown lighting/difficulty value) falls back to a safe default for
   that field only, so loading a preset can never throw or poison the
   rest of the setup. Online matches do not use this module at all.
   The v132/v133 keys are OPTIONAL_BOOL_KEYS: a preset saved before v153
   simply does not carry them, and cleanValues() then omits them from
   the cleaned values instead of inventing a value, so applying an old
   preset leaves the live random-roster / variant-rule settings exactly
   as they are. A key that is present but not a boolean still falls back
   to false, like every other malformed field. */
(()=>{
'use strict';
const KEY='nightball.matchPresets';
const DIFFICULTIES=['casual','standard','pro'];
const LIGHTING=['auto','day','night'];
const INNINGS=[3,5,9];
const CD_KEYS=['bat','pitch','field','run'];
const VARIANT_KEYS=['variantFullCount','variantMetalBat','variantLowReboundBat','variantNoBreaking','variantTwoOuts'];
const OPTIONAL_BOOL_KEYS=['randomRoster',...VARIANT_KEYS];
const FIELDS=['matchTeam','matchOpponent','matchUserHome','innings','park','gameLighting','pitcher','difficulty','customDifficulty','defenseSpeed','fieldSpeed','manualRunning','battingAssist','tiebreak',...OPTIONAL_BOOL_KEYS];
const FALLBACKS={matchTeam:'owls',matchOpponent:'foxes',matchUserHome:true,innings:5,park:'night',gameLighting:'auto',pitcher:0,difficulty:'standard',defenseSpeed:1,fieldSpeed:1,manualRunning:true,battingAssist:true,tiebreak:false,randomRoster:false,variantFullCount:false,variantMetalBat:false,variantLowReboundBat:false,variantNoBreaking:false,variantTwoOuts:false};
function cleanName(name){
 const clean=String(name??'').replace(/[<>&"']/g,'').trim().slice(0,24);
 return clean||'プリセット';
}
const clampCd=(value)=>{const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(-10,Math.min(10,n)):0;};
function cleanCustomDifficulty(source){
 const out={};for(const k of CD_KEYS)out[k]=clampCd(source&&typeof source==='object'?source[k]:0);return out;
}
const boolOr=(value,fallback)=>typeof value==='boolean'?value:fallback;
const speedOr=(value,fallback)=>value===2?2:value===1?1:fallback;
// Shape-only cleanup: keeps plausible values, drops everything else to
// the fallback. Existence checks (club/park ids) live in sanitizeValues,
// which knows the current lists.
function cleanValues(values={}){
 const v=values&&typeof values==='object'?values:{};
 const out={
  matchTeam:typeof v.matchTeam==='string'&&v.matchTeam?v.matchTeam:FALLBACKS.matchTeam,
  matchOpponent:typeof v.matchOpponent==='string'&&v.matchOpponent?v.matchOpponent:FALLBACKS.matchOpponent,
  matchUserHome:boolOr(v.matchUserHome,FALLBACKS.matchUserHome),
  innings:INNINGS.includes(v.innings)?v.innings:FALLBACKS.innings,
  park:typeof v.park==='string'&&v.park?v.park:FALLBACKS.park,
  gameLighting:LIGHTING.includes(v.gameLighting)?v.gameLighting:FALLBACKS.gameLighting,
  pitcher:Number.isInteger(v.pitcher)&&v.pitcher>=0?v.pitcher:FALLBACKS.pitcher,
  difficulty:DIFFICULTIES.includes(v.difficulty)?v.difficulty:FALLBACKS.difficulty,
  customDifficulty:cleanCustomDifficulty(v.customDifficulty),
  defenseSpeed:speedOr(v.defenseSpeed,FALLBACKS.defenseSpeed),
  fieldSpeed:speedOr(v.fieldSpeed,FALLBACKS.fieldSpeed),
  manualRunning:boolOr(v.manualRunning,FALLBACKS.manualRunning),
  battingAssist:boolOr(v.battingAssist,FALLBACKS.battingAssist),
  tiebreak:boolOr(v.tiebreak,FALLBACKS.tiebreak),
 };
 // Optional boolean keys (random roster + variant rules): copy them only
 // when the source actually carries the key. Pre-v153 presets have none
 // of them, and omitting them here is what lets applyMatchPreset's
 // Object.assign leave the live values untouched for those fields.
 for(const k of OPTIONAL_BOOL_KEYS)if(Object.prototype.hasOwnProperty.call(v,k))out[k]=boolOr(v[k],FALLBACKS[k]);
 return out;
}
// Snapshot the live versus settings. The starting pitcher lives in the
// per-club lineup config rather than in settings for non-default clubs,
// so the caller passes the current index explicitly.
function snapshot(settings,pitcher){
 return cleanValues({...settings,pitcher:Number.isInteger(pitcher)?pitcher:settings?.pitcher});
}
// Existence-aware cleanup used when a preset is applied: ids that no
// longer resolve (deleted custom park, removed club) fall back per-field
// and a self-matchup is broken up, mirroring the app's own settings
// validation. ctx: {teamIds, parkIds, defaults} — missing lists simply
// skip that check.
function sanitizeValues(values,ctx={}){
 const out=cleanValues(values);
 const defaults={...FALLBACKS,...(ctx.defaults||{})};
 const teamIds=Array.isArray(ctx.teamIds)?ctx.teamIds:null;
 const parkIds=Array.isArray(ctx.parkIds)?ctx.parkIds:null;
 if(teamIds&&teamIds.length){
  if(!teamIds.includes(out.matchTeam))out.matchTeam=teamIds.includes(defaults.matchTeam)?defaults.matchTeam:teamIds[0];
  if(!teamIds.includes(out.matchOpponent)||out.matchOpponent===out.matchTeam)out.matchOpponent=teamIds.find(id=>id!==out.matchTeam&&id===defaults.matchOpponent)||teamIds.find(id=>id!==out.matchTeam)||out.matchOpponent;
 }
 if(parkIds&&parkIds.length&&!parkIds.includes(out.park))out.park=parkIds.includes(defaults.park)?defaults.park:parkIds[0];
 return out;
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function load(storage){
 const store=storageOr(storage);if(!store)return [];
 try{
  const raw=JSON.parse(store.getItem(KEY)||'[]');
  if(!Array.isArray(raw))return [];
  return raw.filter(p=>p&&typeof p==='object'&&p.id&&p.values&&typeof p.values==='object')
   .map(p=>({id:String(p.id),name:cleanName(p.name),values:cleanValues(p.values)}));
 }catch{return [];}
}
function saveAll(presets,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(presets));return true;}catch{return false;}
}
function add(name,values,storage){
 const presets=load(storage);
 const preset={id:'preset-'+Date.now().toString(36)+'-'+presets.length+'-'+Math.random().toString(36).slice(2,7),name:cleanName(name),values:cleanValues(values)};
 presets.push(preset);saveAll(presets,storage);
 return preset;
}
function remove(id,storage){
 const presets=load(storage).filter(p=>p.id!==id);
 saveAll(presets,storage);
 return presets;
}
function get(id,storage){return load(storage).find(p=>p.id===id)||null;}
const api={KEY,FIELDS,VARIANT_KEYS,OPTIONAL_BOOL_KEYS,DIFFICULTIES,LIGHTING,INNINGS,FALLBACKS,cleanName,cleanValues,snapshot,sanitizeValues,load,saveAll,add,remove,get};
if(typeof window!=='undefined')window.NightMatchPresets=api;
if(typeof globalThis!=='undefined')globalThis.NightMatchPresets=api;
})();
