/* Personal record room (v156, checker item "personal-record-room"):
   a cross-mode career dashboard for the player's own match results.
   Every finished fixture game that flows through app.js commit() (the
   once-guarded result path shared by versus, pennant, online host,
   survival, conquest, draft battle and tournament games) appends one
   minimal entry — mode, result, runs for/against, opponent name — to
   the store under localStorage 'nightball.recordRoom', and the guest
   side of an online match records through the same module from its
   end-message handler. Aggregates (total + per-mode W/L/D, win rate,
   runs) are derived from the store, never kept as separate counters,
   so the dashboard can never disagree with the recorded history.
   Records only accumulate from v156 on: games played before this
   module existed cannot be reconstructed and are NOT backfilled (the
   dashboard says so in its own UI). Older aggregate stores that do
   exist — 'nightball.records' (versus W/L/D), 'nightball.online'
   (per-opponent online record) and the survival best streak — are
   read by the dashboard as reference figures, clearly labelled as
   such; they are never merged into the new totals.
   Double recording is prevented twice over: commit() itself runs at
   most once per game (the app-level `saved` guard, which also covers
   result-modal re-renders and snapshot restores of a finished game),
   and entries that carry a fixture id (pennant / APBC fixtures) are
   deduplicated here against the stored seen-id list, so re-displaying
   or restoring a finished fixture can never count it twice. */
(()=>{
'use strict';
const KEY='nightball.recordRoom';
const HISTORY_MAX=30;
const SEEN_MAX=200;
const MODES=[
 ['match','通常対戦'],
 ['pennant','ペナント'],
 ['online','オンライン対戦'],
 ['survival','サバイバル'],
 ['conquest','全球団制覇'],
 ['draft','ドラフト対決'],
 ['apbc','APBC・大会'],
];
const MODE_LABELS=Object.fromEntries(MODES);
const RESULTS=['win','loss','draw'];
function emptyBucket(){return {games:0,w:0,l:0,d:0,rs:0,ra:0};}
function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?Math.floor(n):0;}
function cleanBucket(v){
 const b=emptyBucket();if(!v||typeof v!=='object')return b;
 b.games=num(v.games);b.w=num(v.w);b.l=num(v.l);b.d=num(v.d);b.rs=num(v.rs);b.ra=num(v.ra);
 return b;
}
function cleanEntry(v){
 if(!v||typeof v!=='object')return null;
 if(!Object.hasOwn(MODE_LABELS,v.mode)||!RESULTS.includes(v.result))return null;
 return {mode:v.mode,result:v.result,rs:num(v.rs),ra:num(v.ra),
  opp:typeof v.opp==='string'?v.opp.slice(0,40):'',
  at:typeof v.at==='string'?v.at:'',
  id:typeof v.id==='string'&&v.id?v.id.slice(0,80):null};
}
function emptyStore(){return {version:1,byMode:{},history:[],seenIds:[]};}
function cleanStore(v){
 const s=emptyStore();if(!v||typeof v!=='object')return s;
 if(v.byMode&&typeof v.byMode==='object')for(const id of Object.keys(MODE_LABELS)){
  if(v.byMode[id])s.byMode[id]=cleanBucket(v.byMode[id]);
 }
 if(Array.isArray(v.history))s.history=v.history.map(cleanEntry).filter(Boolean).slice(0,HISTORY_MAX);
 if(Array.isArray(v.seenIds))s.seenIds=v.seenIds.filter(x=>typeof x==='string'&&x).slice(-SEEN_MAX);
 return s;
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function load(storage){
 const store=storageOr(storage);if(!store)return emptyStore();
 try{return cleanStore(JSON.parse(store.getItem(KEY)||'null'));}catch{return emptyStore();}
}
function save(state,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(cleanStore(state)));return true;}catch{return false;}
}
// Pure: fold one finished game into a store and return the new store.
// Returns null when the entry is invalid or its fixture id was already
// recorded (duplicate display / restore protection).
function applyResult(state,entry){
 const e=cleanEntry(entry);if(!e)return null;
 const s=cleanStore(state);
 if(e.id&&s.seenIds.includes(e.id))return null;
 const b=s.byMode[e.mode]||(s.byMode[e.mode]=emptyBucket());
 b.games++;b.rs+=e.rs;b.ra+=e.ra;
 if(e.result==='win')b.w++;else if(e.result==='loss')b.l++;else b.d++;
 s.history.unshift(e);s.history=s.history.slice(0,HISTORY_MAX);
 if(e.id){s.seenIds.push(e.id);s.seenIds=s.seenIds.slice(-SEEN_MAX);}
 return s;
}
function recordResult(entry,storage){
 const next=applyResult(load(storage),entry);
 if(!next)return null;
 return save(next,storage)?next:null;
}
// Win rate the baseball way: draws are excluded from the denominator.
function winRate(b){
 if(!b)return null;
 const decided=b.w+b.l;
 return decided>0?b.w/decided:null;
}
function formatRate(b){
 const r=winRate(b);
 return r===null?'—':r.toFixed(3).replace(/^0/,'');
}
function summarize(state){
 const s=cleanStore(state);
 const total=emptyBucket();
 for(const b of Object.values(s.byMode)){
  total.games+=b.games;total.w+=b.w;total.l+=b.l;total.d+=b.d;total.rs+=b.rs;total.ra+=b.ra;
 }
 return {total,byMode:MODES.map(([id,label])=>({id,label,...(s.byMode[id]||emptyBucket())})),history:s.history};
}
const api={KEY,HISTORY_MAX,MODES,MODE_LABELS,emptyBucket,emptyStore,cleanStore,cleanEntry,
 load,save,applyResult,recordResult,winRate,formatRate,summarize};
if(typeof window!=='undefined')window.NightRecordRoom=api;
if(typeof globalThis!=='undefined')globalThis.NightRecordRoom=api;
})();
