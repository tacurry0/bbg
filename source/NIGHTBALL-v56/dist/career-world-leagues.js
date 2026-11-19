/* Domestic calendars, postseason brackets and the NIGHTBALL Asia Series. */
(()=>{
 'use strict';
 const D=NightCareerWorldData;
 const {date,stamp,roster,roundRobin,leagueCountries}=D;
 const reverse=(pair,n)=>n%2?pair.slice().reverse():pair;
 function repeat(rounds,count){
  return Array.from({length:count},(_,n)=>rounds.map(row=>row.map(pair=>reverse(pair,n)))).flat();
 }
 function schedules(year,short){
  const days={};
  for(const country of leagueCountries){
   const clubs=roster(country);
   let rounds;
   if(country==='jp'){
    const ids=d=>clubs.filter(c=>c.division===d).map(c=>c.id);
    const central=ids('central'),pacific=ids('pacific');
    const a=roundRobin(central),b=roundRobin(pacific);
    const regular=repeat(a.map((row,i)=>row.concat(b[i])),short?2:25);
    const crossover=central.flatMap((_,n)=>{
     const pairs=central.map((c,i)=>[c,pacific[(n+i)%pacific.length]]);
     if(short)return [pairs,pairs.map(pair=>reverse(pair,1))];
     const hosted=pairs.map(pair=>reverse(pair,n+year));
     return [hosted,hosted,hosted];
    });
    rounds=[...regular.slice(0,short?5:46),...crossover,...regular.slice(short?5:46)];
   }else rounds=repeat(roundRobin(clubs.map(c=>c.id)),country==='tw'?(short?4:24):(short?2:16));
   const first=date(year,country==='jp'?'03-27':country==='tw'?'03-29':'03-28');
   for(const [i,row] of rounds.entries()){
    const offset=Math.floor(i*185/rounds.length);
    const day=stamp(first,offset),half=i<rounds.length/2?'first':'second';
    (days[day] ||= []).push(...row.map(([home,away],j)=>({id:`${year}/${country}/${i+1}/${j}`,country,home,away,half,kind:'regular',day,name:D.countries[country].league+'公式戦'})));
   }
  }
  return days;
 }
 const row=()=>({w:0,l:0,t:0,rf:0,ra:0});
 const pct=x=>x.w+x.l?x.w/(x.w+x.l):0;
 function tables(){
  return Object.fromEntries(leagueCountries.flatMap(c=>roster(c)).map(c=>[c.id,{all:row(),first:row(),second:row()}]));
 }
 function standings(table,ids,split='all'){
  return ids.map(id=>({id,...table[id][split]})).sort((a,b)=>pct(b)-pct(a)||b.w-a.w||
   (b.rf-b.ra)-(a.rf-a.ra)||b.rf-a.rf||a.id.localeCompare(b.id));
 }
 function record(table,f,score){
  for(const [id,own,opp] of [[f.home,score.home,score.away],[f.away,score.away,score.home]]){
   for(const key of ['all',f.half]){
    const r=table[id][key];r.rf+=own;r.ra+=opp;r[own>opp?'w':own<opp?'l':'t']++;
   }
  }
 }
 const series=(id,name,upper,lower,target,limit,credit=0,rule='alternating')=>({
  id,name,upper,lower,target,limit,credit,rule,wins:[credit,0],games:[],winner:null
 });
 function createPost(table){
  const jp=Object.fromEntries(['central','pacific'].map(division=>[division,
   standings(table,roster('jp').filter(c=>c.division===division).map(c=>c.id))]));
  const twIds=roster('tw').map(c=>c.id),tw=standings(table,twIds);
  const halves=['first','second'].map(key=>standings(table,twIds,key)[0].id);
  const both=halves[0]===halves[1];
  const direct=both?halves[0]:tw.find(r=>halves.includes(r.id)).id;
  const wild=both?tw.filter(r=>r.id!==direct).slice(0,2).map(r=>r.id):
   [halves.find(id=>id!==direct),tw.find(r=>!halves.includes(r.id)).id];
  const kr=standings(table,roster('kr').map(c=>c.id));
  return {jp,tw,kr,halves,direct,both,started:false,champions:{},series:{
   central:[series('central-first','セ・リーグ CS ファースト',jp.central[1].id,jp.central[2].id,2,3,0,'cs')],
   pacific:[series('pacific-first','パ・リーグ CS ファースト',jp.pacific[1].id,jp.pacific[2].id,2,3,0,'cs')],
   japan:[],
   tw:[series('tw-first','CPBL 季後挑戰賽',wild[0],wild[1],3,both?5:4,both?0:1,'taiwan')],
   kr:[series('kr-wild','KBO ワイルドカード',kr[3].id,kr[4].id,2,2,1,'wc')]
  },asia:null,done:false};
 }
 function extend(post){
  const g=post.series;
  for(const div of ['central','pacific']){
   const winner=g[div][0].winner;
   if(winner&&g[div].length===1){
    const rows=post.jp[div],leader=rows[0],challenger=rows.find(r=>r.id===winner);
    const behind=(leader.w-challenger.w+challenger.l-leader.l)/2;
    const advantage=behind>=10||pct(challenger)<.5?2:1;
    g[div].push(series(div+'-final',(div==='central'?'セ':'パ')+'・リーグ CS ファイナル',
     leader.id,winner,3+advantage,5+advantage,advantage,'cs'));
   }
  }
  const central=g.central[1]?.winner,pacific=g.pacific[1]?.winner;
  if(central&&pacific&&!g.japan.length)g.japan.push(series('japan','日本シリーズ',central,pacific,4,7,0,'japan'));
  if(g.japan[0]?.winner)post.champions.jp=g.japan[0].winner;
  if(g.tw[0].winner&&g.tw.length===1)g.tw.push(series('tw-final','台湾シリーズ',post.direct,g.tw[0].winner,4,post.both?6:7,post.both?1:0,'taiwan'));
  if(g.tw[1]?.winner)post.champions.tw=g.tw[1].winner;
  const rounds=[['kr-semi','KBO 準プレーオフ',2,3,5],['kr-play','KBO プレーオフ',1,3,5],['kr-final','韓国シリーズ',0,4,7]];
  const last=g.kr.at(-1),next=rounds[g.kr.length-1];
  if(last.winner&&next){
   const [id,label,seed,target,limit]=next;
   g.kr.push(series(id,label,post.kr[seed].id,last.winner,target,limit));
  }
  if(g.kr[3]?.winner)post.champions.kr=g.kr[3].winner;
 }
 function asiaStart(post,year){
  const host=leagueCountries[(year-2027)%leagueCountries.length];
  const clubs=leagueCountries.map(c=>post.champions[c]);
  post.asia={host,clubs,games:[],table:Object.fromEntries(clubs.map(id=>[id,{all:row(),first:row()}])),winner:null,mvp:null,stats:{}};
 }
 function fixtures(post,year,day){
  extend(post);
  if(Object.keys(post.champions).length===3&&!post.asia){
   if(day<date(year,'11-18'))return [];
   asiaStart(post,year);
  }
  if(post.asia){
   const a=post.asia,i=a.games.length;
   if(i>=4)return [];
   const final=i===3,rank=asiaStandings(a);
   const [home,away]=final?rank.slice(0,2).map(r=>r.id):[[a.clubs[0],a.clubs[1]],[a.clubs[2],a.clubs[0]],[a.clubs[1],a.clubs[2]]][i];
   return [{id:`${year}/asia/${i+1}`,kind:'asia',country:a.host,home,away,half:'first',day,name:final?'🏆 アジアシリーズ決勝':'アジアシリーズ 総当たり',final,park:D.park(a.host)}];
  }
  return Object.entries(post.series).flatMap(([key,list])=>{
   const s=list.at(-1);
   if(!s||s.winner)return [];
   const i=s.games.length;
   const upperHome=s.rule==='cs'||s.rule==='wc'||
    (s.rule==='japan'?[true,true,false,false,false,true,true,true][i]??i%2===1:
     s.rule==='taiwan'?i<2||i>=4:i<2||i>=5);
   const [home,away]=upperHome?[s.upper,s.lower]:[s.lower,s.upper];
   return [{id:`${year}/${s.id}/${i+1}`,kind:'post',country:['central','pacific','japan'].includes(key)?'jp':key,
    home,away,day,name:`${s.name} 第${i+1}戦`,series:key}];
  });
 }
 function recordPost(post,f,result){
  if(f.kind==='asia'){
   const a=post.asia;
   a.games.push({homeId:f.home,awayId:f.away,...result});
   if(f.final){a.winner=result.home>result.away?f.home:f.away;post.done=true;}
   else record(a.table,f,result);
   return;
  }
  const s=post.series[f.series].at(-1);
  s.games.push({homeId:f.home,awayId:f.away,...result});
  const winner=result.home>result.away?f.home:result.home<result.away?f.away:null;
  if(winner)s.wins[winner===s.upper?0:1]++;
  const [a,b]=s.wins,remaining=s.limit-s.games.length;
  if(a>=s.target||s.rule==='wc'&&!winner||s.rule==='cs'&&a>=b+remaining)s.winner=s.upper;
  else if(b>=s.target)s.winner=s.lower;
  else if(remaining<=0&&s.rule!=='japan')s.winner=a>=b?s.upper:s.lower;
 }
 function asiaStandings(a){
  return standings(a.table,a.clubs).sort((x,y)=>{
   const primary=pct(y)-pct(x);
   if(primary)return primary;
   if(a.clubs.filter(id=>pct(a.table[id].all)===pct(x)).length===2){
    const g=a.games.find(g=>[g.homeId,g.awayId].includes(x.id)&&[g.homeId,g.awayId].includes(y.id));
    if(g&&g.home!==g.away){
     const winner=g.home>g.away?g.homeId===x.id?-1:1:g.home<g.away?g.awayId===x.id?-1:1:0;
     if(winner)return winner;
    }
   }
   return y.rf-y.ra-(x.rf-x.ra)||y.rf-x.rf||x.id.localeCompare(y.id);
  });
 }
 window.NightCareerWorldLeagues={schedules,tables,standings,record,createPost,fixtures,recordPost,asiaStandings,pct};
})();
