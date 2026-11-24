/* All-leagues conquest challenge (v140, checker item
   "all-leagues-conquest"): a long-form challenge built on the regular
   versus-match engine (mode 'match'). The user picks one home club and
   fights the other 29 clubs (CPBL + NPB + KBO) in any order they like,
   choosing each next opponent from the conquest list. A win stamps
   that opponent as conquered; a loss or a draw stamps nothing and the
   same opponent can be retried any number of times. Beating all 29
   opponents completes the conquest for that home club.
   This module owns only the progress state: which opponents have been
   beaten with which home club. Progress lives in localStorage under
   'nightball.conquest' as a map keyed by home-club id, so each club's
   campaign is independent and pennant / survival / career saves are
   never touched. The mode is never offered online. */
(()=>{
'use strict';
const KEY='nightball.conquest';
const LEAGUES=[
 {id:'cpbl',label:'CPBL'},
 {id:'npb',label:'NPB'},
 {id:'kbo',label:'KBO'},
];
// A club's league: NPB and KBO clubs carry league:'npb'/'kbo'; the
// original CPBL clubs carry no league field and are the CPBL group.
function leagueOf(club){
 if(!club||typeof club!=='object')return 'cpbl';
 if(club.league==='npb')return 'npb';
 if(club.league==='kbo')return 'kbo';
 return 'cpbl';
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function cleanProgress(value){
 if(!value||typeof value!=='object')return null;
 if(typeof value.userTeamId!=='string'||!value.userTeamId)return null;
 const defeated=[...new Set((Array.isArray(value.defeated)?value.defeated:[])
  .filter(id=>typeof id==='string'&&id&&id!==value.userTeamId))];
 const attempts={};
 if(value.attempts&&typeof value.attempts==='object')
  for(const [id,n] of Object.entries(value.attempts)){
   const c=Number(n);
   if(typeof id==='string'&&id&&Number.isFinite(c)&&c>0)attempts[id]=Math.floor(c);
  }
 return {v:1,userTeamId:value.userTeamId,defeated,attempts,
  completedAt:typeof value.completedAt==='string'&&value.completedAt?value.completedAt:null};
}
function createProgress(userTeamId){
 if(typeof userTeamId!=='string'||!userTeamId)return null;
 return {v:1,userTeamId,defeated:[],attempts:{},completedAt:null};
}
function loadAll(storage){
 const store=storageOr(storage);if(!store)return {};
 try{
  const raw=JSON.parse(store.getItem(KEY)||'null');
  if(!raw||typeof raw!=='object')return {};
  const out={};
  for(const [id,value] of Object.entries(raw)){
   const clean=cleanProgress(value);
   if(clean&&clean.userTeamId===id)out[id]=clean;
  }
  return out;
 }catch{return {};}
}
function saveAll(all,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(all&&typeof all==='object'?all:{}));return true;}catch{return false;}
}
function loadProgress(userTeamId,storage){
 if(typeof userTeamId!=='string'||!userTeamId)return null;
 return loadAll(storage)[userTeamId]||null;
}
function saveProgress(progress,storage){
 const clean=cleanProgress(progress);if(!clean)return false;
 const all=loadAll(storage);all[clean.userTeamId]=clean;
 return saveAll(all,storage);
}
function clearProgress(userTeamId,storage){
 if(typeof userTeamId!=='string'||!userTeamId)return false;
 const all=loadAll(storage);delete all[userTeamId];
 if(!Object.keys(all).length){
  const store=storageOr(storage);if(!store)return false;
  try{store.removeItem(KEY);return true;}catch{return false;}
 }
 return saveAll(all,storage);
}
function opponentsOf(userTeamId,clubs){
 return (Array.isArray(clubs)?clubs:[]).filter(c=>c&&typeof c.id==='string'&&c.id!==userTeamId);
}
// Progress summary: total opponents, conquered count, and the same
// split per league (e.g. NPB 8/14) for the conquest list screen.
function summarize(progress,clubs){
 const state=cleanProgress(progress);
 const userTeamId=state?state.userTeamId:null;
 const opponents=userTeamId?opponentsOf(userTeamId,clubs):[];
 const beaten=new Set(state?state.defeated:[]);
 const byLeague=LEAGUES.map(l=>({id:l.id,label:l.label,total:0,done:0}));
 const byId=new Map(byLeague.map(l=>[l.id,l]));
 for(const club of opponents){
  const row=byId.get(leagueOf(club));if(!row)continue;
  row.total++;if(beaten.has(club.id))row.done++;
 }
 const total=opponents.length,done=opponents.filter(c=>beaten.has(c.id)).length;
 return {userTeamId,total,done,remaining:total-done,complete:total>0&&done===total,byLeague};
}
function isComplete(progress,clubs){
 return summarize(progress,clubs).complete;
}
// Record one finished conquest game. Only a win stamps the opponent;
// a loss or a draw leaves every existing stamp untouched (retryable).
// When the last remaining opponent falls, completedAt is stamped once
// and the result reports the completion.
function recordResult(progress,result={},clubs,storage,now){
 const state=cleanProgress(progress)||createProgress(result.userTeamId);
 if(!state)return null;
 const opponentId=typeof result.opponentId==='string'?result.opponentId:'';
 if(!opponentId||opponentId===state.userTeamId)return null;
 state.attempts[opponentId]=(state.attempts[opponentId]||0)+1;
 const won=result.won===true&&!result.draw;
 const conqueredNow=won&&!state.defeated.includes(opponentId);
 if(conqueredNow)state.defeated.push(opponentId);
 const summary=summarize(state,clubs);
 const completedNow=summary.complete&&!state.completedAt;
 if(summary.complete&&!state.completedAt)
  state.completedAt=typeof now==='string'&&now?now:new Date().toISOString();
 saveProgress(state,storage);
 return {state,won,draw:!!result.draw,conqueredNow,completedNow,...summary};
}
const api={KEY,LEAGUES,leagueOf,cleanProgress,createProgress,loadAll,saveAll,
 loadProgress,saveProgress,clearProgress,opponentsOf,summarize,isComplete,recordResult};
if(typeof window!=='undefined')window.NightConquest=api;
if(typeof globalThis!=='undefined')globalThis.NightConquest=api;
})();
