/* Survival ladder mode (v138, checker item "survival-ladder"): an
   endless win-streak mode built on the regular versus-match engine
   (mode 'match'). The user picks a club and faces a random opponent;
   every win advances the streak and the next opponent gets stronger
   in stages, while a loss — or a draw, which counts as a defeat in
   this mode — ends the run. Fatigue carries over between games:
   pitchers lose stamina and batters lose condition based on how much
   they were used, with only a small recovery between games so a run
   can never fully reset (but also never hard-locks: recovery always
   applies, and a fresh run always starts clean).
   This module owns the run state, the stage table, the fatigue model
   and the best-streak store. The engine (NightGame.normalizeSurvival)
   owns the in-game application: opponent boost and user fatigue are
   folded into conditionFor(), and a fatigued starting pitcher begins
   the game with reduced stamina. Run state lives in localStorage
   under 'nightball.survival' and the best streak under
   'nightball.survivalBest'; pennant/career saves are never touched,
   and the mode is never offered online. */
(()=>{
'use strict';
const KEY='nightball.survival';
const BEST_KEY='nightball.survivalBest';
// Opponent rating boost (points added across the opponent's ratings
// via condition) per win count. Stage 1 starts deliberately weak so
// early wins are reachable; the boost turns positive at 4 wins and
// caps at +12 from 9 wins on.
const BOOSTS=[-8,-5,-2,0,3,5,7,9,11];
const MAX_BOOST=12;
function boostForWins(wins){
 const w=Number.isFinite(Number(wins))?Math.max(0,Math.floor(Number(wins))):0;
 return w>=BOOSTS.length?MAX_BOOST:BOOSTS[w];
}
function stageForWins(wins){
 const w=Number.isFinite(Number(wins))?Math.max(0,Math.floor(Number(wins))):0;
 return {stage:Math.min(w,BOOSTS.length-1)+1,boost:boostForWins(w),wins:w};
}
// Fatigue model. Points accumulate per game from usage, then a small
// fixed recovery is applied between games (pitchers recover more
// because their per-game load is much larger). Condition penalty:
// pitchers lose 1 condition level per full 10 points, batters per
// full 5 points, capped at 3 levels either way.
const RECOVERY={pitcher:10,batter:2};
function pitcherFatigueAdd(pitches){
 const p=Number(pitches);if(!Number.isFinite(p)||p<=0)return 0;
 return Math.min(35,Math.ceil(p/3));
}
function batterFatigueAdd(pa){
 const p=Number(pa);if(!Number.isFinite(p)||p<=0)return 0;
 return Math.min(6,Math.floor(p));
}
function conditionPenalty(isPitcher,points){
 const p=Number(points);if(!Number.isFinite(p)||p<=0)return 0;
 return Math.min(3,Math.floor(p/(isPitcher?10:5)));
}
function staminaLoss(points){
 const p=Number(points);if(!Number.isFinite(p)||p<=0)return 0;
 return Math.min(40,Math.floor(p));
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function cleanFatigue(value){
 const out={};if(!value||typeof value!=='object')return out;
 for(const [id,pts] of Object.entries(value)){
  const n=Number(pts);
  if(typeof id==='string'&&id&&Number.isFinite(n)&&n>0)out[id]=Math.min(60,Math.floor(n));
 }
 return out;
}
function cleanState(value){
 if(!value||typeof value!=='object')return null;
 if(typeof value.userTeamId!=='string'||!value.userTeamId)return null;
 if(typeof value.opponentId!=='string'||!value.opponentId)return null;
 const wins=Number.isFinite(Number(value.wins))?Math.max(0,Math.floor(Number(value.wins))):0;
 return {
  v:1,userTeamId:value.userTeamId,opponentId:value.opponentId,wins,
  fatiguePitchers:cleanFatigue(value.fatiguePitchers),
  fatigueBatters:cleanFatigue(value.fatigueBatters),
  history:Array.isArray(value.history)?value.history.filter(h=>h&&typeof h.opponentId==='string').map(h=>({opponentId:h.opponentId,won:!!h.won,draw:!!h.draw})).slice(-99):[],
  status:value.status==='ended'?'ended':'active',
 };
}
function pickOpponent(poolIds,excludeIds,rng){
 const pool=(Array.isArray(poolIds)?poolIds:[]).filter(id=>typeof id==='string'&&id&&!excludeIds.includes(id));
 if(!pool.length)return null;
 const rand=typeof rng==='function'?rng:Math.random;
 return pool[Math.min(pool.length-1,Math.max(0,Math.floor(rand()*pool.length)))];
}
function createRun(userTeamId,poolIds,rng){
 if(typeof userTeamId!=='string'||!userTeamId)return null;
 const opponentId=pickOpponent(poolIds,[userTeamId],rng);
 if(!opponentId)return null;
 return {v:1,userTeamId,opponentId,wins:0,fatiguePitchers:{},fatigueBatters:{},history:[],status:'active'};
}
function loadRun(storage){
 const store=storageOr(storage);if(!store)return null;
 try{return cleanState(JSON.parse(store.getItem(KEY)||'null'));}catch{return null;}
}
function saveRun(state,storage){
 const store=storageOr(storage);if(!store)return false;
 const clean=cleanState(state);if(!clean)return false;
 try{store.setItem(KEY,JSON.stringify(clean));return true;}catch{return false;}
}
function clearRun(storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.removeItem(KEY);return true;}catch{return false;}
}
function loadBest(storage){
 const store=storageOr(storage);if(!store)return 0;
 try{const n=Number(JSON.parse(store.getItem(BEST_KEY)||'0'));return Number.isFinite(n)&&n>0?Math.floor(n):0;}catch{return 0;}
}
function saveBest(value,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(BEST_KEY,JSON.stringify(Math.max(0,Math.floor(Number(value)||0))));return true;}catch{return false;}
}
// Apply one finished game to a run. result = {won, draw, usage:
// {pitchers:{id:pitches}, batters:{id:pa}}, poolIds, rng}.
// A draw counts as a defeat (documented in the mode UI). On a win the
// streak advances, fatigue (after recovery) carries over and the next
// opponent is drawn — never the club just beaten if another choice
// exists, and never the user's own club. On defeat the run ends, the
// best streak is updated and the stored run is cleared.
function recordResult(state,result={},storage){
 const run=cleanState(state);if(!run||run.status!=='active')return null;
 const usage=result.usage&&typeof result.usage==='object'?result.usage:{};
 for(const [id,pitches] of Object.entries(usage.pitchers||{})){
  const add=pitcherFatigueAdd(pitches);if(add)run.fatiguePitchers[id]=Math.min(60,(run.fatiguePitchers[id]||0)+add);
 }
 for(const [id,pa] of Object.entries(usage.batters||{})){
  const add=batterFatigueAdd(pa);if(add)run.fatigueBatters[id]=Math.min(60,(run.fatigueBatters[id]||0)+add);
 }
 // Between-game recovery (applied before the next game, win or lose).
 for(const map of [run.fatiguePitchers])for(const id of Object.keys(map)){map[id]-=RECOVERY.pitcher;if(map[id]<=0)delete map[id];}
 for(const map of [run.fatigueBatters])for(const id of Object.keys(map)){map[id]-=RECOVERY.batter;if(map[id]<=0)delete map[id];}
 const won=result.won===true&&!result.draw;
 run.history.push({opponentId:run.opponentId,won,draw:!!result.draw});
 if(won){
  run.wins++;
  const next=pickOpponent(result.poolIds,[run.userTeamId,run.opponentId],result.rng)
   ||pickOpponent(result.poolIds,[run.userTeamId],result.rng);
  if(next)run.opponentId=next;
  saveRun(run,storage);
  return {state:run,ended:false,won:true,best:loadBest(storage),bestUpdated:false,stage:stageForWins(run.wins)};
 }
 run.status='ended';
 const bestBefore=loadBest(storage),bestUpdated=run.wins>bestBefore,best=Math.max(bestBefore,run.wins);
 if(bestUpdated)saveBest(best,storage);
 clearRun(storage);
 return {state:run,ended:true,won:false,best,bestUpdated,stage:stageForWins(run.wins)};
}
// The engine option payload for the run's next game.
function gameOption(state){
 const run=cleanState(state);if(!run||run.status!=='active')return null;
 return {wins:run.wins,boost:boostForWins(run.wins),
  fatiguePitchers:{...run.fatiguePitchers},fatigueBatters:{...run.fatigueBatters}};
}
const api={KEY,BEST_KEY,BOOSTS,MAX_BOOST,RECOVERY,boostForWins,stageForWins,
 pitcherFatigueAdd,batterFatigueAdd,conditionPenalty,staminaLoss,
 cleanState,cleanFatigue,pickOpponent,createRun,loadRun,saveRun,clearRun,
 loadBest,saveBest,recordResult,gameOption};
if(typeof window!=='undefined')window.NightSurvival=api;
if(typeof globalThis!=='undefined')globalThis.NightSurvival=api;
})();
