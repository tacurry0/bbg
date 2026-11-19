/* 2026 NPB postseason format. */
(()=>{
 'use strict';
 const central='npb-central',pacific='npb-pacific';
 const makeSeries=(id,higher,lower,target,limit=null,advantage=0)=>({
  id,higher,lower,target,limit,advantage,wins:{[higher]:advantage,[lower]:0},games:[],winner:null
 });
 const japanSeries=(centralWinner,pacificWinner)=>makeSeries('japan',centralWinner,pacificWinner,4);
 const title=series=>series.id==='japan'?'日本シリーズ':series.id.endsWith('-first')?'ファーストステージ':'ファイナルステージ';

 function makeBracket(league,id){
  const seeds=league.playoffSeeds(id);
  return {seeds,qualifier:makeSeries(id+'-first',seeds[1].clubId,seeds[2].clubId,2,3),final:null};
 }
 function finalSeries(league,id,bracket){
  const challenger=league.standings(id).find(row=>row.id===bracket.qualifier.winner);
  const advantage=challenger.behind>=10||challenger.pct<.5?2:1;
  return makeSeries(id+'-final',bracket.seeds[0].clubId,challenger.id,3+advantage,5+advantage,advantage);
 }
 function fixture(series){
  const game=series.games.length+1,japan=series.id==='japan';
  const higherHome=!japan||game<=2||(game>=6&&game<=8)||(game>=10&&game%2===0);
  const drawClinches=!japan&&series.wins[series.higher]>=series.wins[series.lower]+series.limit-game;
  return {id:'po-'+series.id+'-'+game,home:higherHome?series.higher:series.lower,away:higherHome?series.lower:series.higher,
   game,playoff:true,series:series.id,drawClinches,innings:9,maxInnings:japan&&game>=8?null:12};
 }
 function validScore(score,f){
  return [score?.homeScore,score?.awayScore].every(n=>Number.isInteger(n)&&n>=0)&&
   Number.isInteger(score.innings)&&score.innings>=9&&
   (f.maxInnings===null||score.innings<=f.maxInnings)&&
   (score.homeScore!==score.awayScore||score.innings===f.maxInnings);
 }
 function append(series,result){
  series.games.push(result);
  if(result.homeScore!==result.awayScore){
   const winner=result.homeScore>result.awayScore?result.home:result.away;
   if(++series.wins[winner]===series.target){series.winner=winner;return;}
  }
  if(series.limit===null)return;
  const remaining=series.limit-series.games.length;
  const upper=series.wins[series.higher],lower=series.wins[series.lower];
  if(upper>=lower+remaining)series.winner=series.higher;
  else if(remaining===0)series.winner=series.lower;
 }
 function start(league){
  league.postseason={schema:2,stage:'qualifier',brackets:{
   [central]:makeBracket(league,central),[pacific]:makeBracket(league,pacific)
  },japan:null,awaitingNext:false,champion:null};
  league.currentGame=null;
  return true;
 }
 function activeSeries(league){
  const p=league.postseason;
  return p.stage==='japan'||p.stage==='complete'?p.japan:p.brackets[league.leagueId][p.stage];
 }
 function complete(league,score){
  const p=league.postseason,series=activeSeries(league),f=fixture(series);
  if(score.leagueFixtureId&&score.leagueFixtureId!==f.id)return false;
  if(score.teams&&(score.teams.home.id!==f.home||score.teams.away.id!==f.away))return false;
  const result={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning??score.innings??9};
  if(!validScore(result,f))throw Error('Invalid NPB postseason result');
  append(series,result);
  p.awaitingNext=true;
  league.currentGame=null;
  if(p.stage==='japan'&&series.winner){p.stage='complete';p.champion=series.winner;}
  return true;
 }
 function simulateSeries(league,series){
  while(!series.winner){
   const f=fixture(series);
   append(series,{...f,...league.simulate(f)});
  }
 }
 function next(league){
  const p=league.postseason,own=p.brackets[league.leagueId];
  if(p.stage==='qualifier'&&own.qualifier.winner){
   own.final=finalSeries(league,league.leagueId,own);
   p.stage='final';
  }else if(p.stage==='final'&&own.final.winner){
   const other=p.brackets[league.otherLeague];
   simulateSeries(league,other.qualifier);
   other.final=finalSeries(league,league.otherLeague,other);
   simulateSeries(league,other.final);
   p.japan=japanSeries(p.brackets[central].final.winner,p.brackets[pacific].final.winner);
   p.stage='japan';
  }
  p.awaitingNext=false;
  league.currentGame=null;
  return true;
 }

 function validSeries(saved,expected){
  if(!saved||!Array.isArray(saved.games)||['id','higher','lower','target','limit','advantage'].some(k=>saved[k]!==expected[k]))return false;
  for(const result of saved.games){
   const f=fixture(expected);
   if(expected.winner||!validScore(result,f)||['id','home','away','game','series','playoff','drawClinches','maxInnings'].some(k=>result[k]!==f[k]))return false;
   append(expected,result);
  }
  return [expected.higher,expected.lower].every(id=>saved.wins?.[id]===expected.wins[id])&&saved.winner===expected.winner;
 }
 function valid(league){
  const p=league.postseason;
  if(p.schema!==2||!league.regularCompleted||typeof p.awaitingNext!=='boolean'||!['qualifier','final','japan','complete'].includes(p.stage))return false;
  const japanStarted=p.stage==='japan'||p.stage==='complete';
  for(const id of [central,pacific]){
   const bracket=p.brackets?.[id],expected=makeBracket(league,id);
   if(!Array.isArray(bracket?.seeds)||bracket.seeds.length!==3||expected.seeds.some((s,i)=>s.clubId!==bracket.seeds[i]?.clubId||s.seed!==bracket.seeds[i]?.seed))return false;
   if(!validSeries(bracket.qualifier,expected.qualifier))return false;
   const needFinal=japanStarted||(id===league.leagueId&&p.stage==='final');
   if(needFinal){
    if(!expected.qualifier.winner||!validSeries(bracket.final,finalSeries(league,id,expected)))return false;
    if(japanStarted&&!bracket.final.winner)return false;
   }else if(bracket.final||(id!==league.leagueId&&expected.qualifier.games.length))return false;
  }
  if(japanStarted){
   const expected=japanSeries(p.brackets[central].final.winner,p.brackets[pacific].final.winner);
   if(!validSeries(p.japan,expected))return false;
   if(p.stage==='complete')return !!expected.winner&&p.champion===expected.winner&&p.awaitingNext;
   if(expected.winner)return false;
  }else if(p.japan)return false;
  const series=activeSeries(league);
  return !p.champion&&(!series.winner||p.awaitingNext)&&(!p.awaitingNext||series.games.length>0);
 }
 window.NightNPBPostseason={activeSeries,complete,fixture,next,start,title,valid};
})();
