/* Time attack mode (v134, checker item "time-attack-mode"): a short
   timed mode built on the regular versus-match engine (mode 'match').
   Two kinds:
     bat   - the user keeps batting for the whole clock; the score is
             how many runs they drive in before time expires. Three
             outs do not end the run — the next "half" is the user's
             batting again with the bases cleared.
     pitch - the user keeps pitching for the whole clock; the score is
             how many outs they record before time expires. Runs
             allowed are tracked alongside.
   The engine (NightGame.normalizeTimeAttack / finishTimeAttack) owns
   the in-game clock and the result tally; this module owns the config
   shape and the best-score store, kept in localStorage under
   'nightball.timeAttackBest' as {bat:<runs>, pitch:<outs>}. Best
   scores only ever move up, and a corrupt or missing store reads as
   zeroes rather than throwing. */
(()=>{
'use strict';
const KEY='nightball.timeAttackBest';
const KINDS=['bat','pitch'];
const DURATIONS=[60,90,120];
// Shape-only cleanup for a {kind, seconds} config. The engine gate
// (NightGame.normalizeTimeAttack) decides which modes may use it; here
// any sane duration is accepted so tests can run short clocks, while
// the app UI only ever offers DURATIONS.
function cleanConfig(config){
 if(!config||typeof config!=='object')return null;
 if(!KINDS.includes(config.kind))return null;
 const seconds=Number(config.seconds);
 if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return null;
 return {kind:config.kind,seconds:Math.round(seconds)};
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function cleanBest(value){
 const v=value&&typeof value==='object'?value:{};
 const num=x=>Number.isFinite(Number(x))&&Number(x)>0?Math.floor(Number(x)):0;
 return {bat:num(v.bat),pitch:num(v.pitch)};
}
function loadBest(storage){
 const store=storageOr(storage);if(!store)return {bat:0,pitch:0};
 try{return cleanBest(JSON.parse(store.getItem(KEY)||'null'));}catch{return {bat:0,pitch:0};}
}
function saveBest(best,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(cleanBest(best)));return true;}catch{return false;}
}
// Record a finished run. Returns {best, updated, value} for the kind:
// best is the stored best after this run, updated says whether this
// run set a new record, value is the score that was recorded.
function recordBest(kind,value,storage){
 const best=loadBest(storage);
 const score=Number.isFinite(Number(value))&&Number(value)>0?Math.floor(Number(value)):0;
 const updated=KINDS.includes(kind)&&score>best[kind];
 if(updated){best[kind]=score;saveBest(best,storage);}
 return {best,updated,value:score};
}
// The headline score of a finished (or live) time-attack result:
// runs for the batting kind, outs for the pitching kind.
function scoreOf(result){
 if(!result||typeof result!=='object')return 0;
 return result.kind==='pitch'?(result.outs||0):(result.runs||0);
}
const api={KEY,KINDS,DURATIONS,cleanConfig,cleanBest,loadBest,saveBest,recordBest,scoreOf};
if(typeof window!=='undefined')window.NightTimeAttack=api;
if(typeof globalThis!=='undefined')globalThis.NightTimeAttack=api;
})();
