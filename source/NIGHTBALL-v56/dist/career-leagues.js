/* Abbreviated schedules and deterministic AI results for player career. */
(()=>{
 'use strict';
 const SCHOOL_TEAMS=['明徳学園','港南高校','桜陵高校','東嶺学院','南浜高校','西陵工業','城北商業','白峰学園'];
 const ROUNDS=['地区予選 準決勝','地区予選 決勝','全国大会 準決勝','全国大会 決勝'];
 const random=key=>{
  let n=2166136261;
  for(const letter of key)n=Math.imul(n^letter.charCodeAt(0),16777619);
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 };
 const poisson=(rng,rate)=>{
  let runs=0;
  for(let i=0;i<12;i++)if(rng()<rate/12)runs++;
  return runs;
 };
 const matchDate=(month,day,offset=0)=>{
  const date=new Date(Date.UTC(2026,month-1,day+offset));
  return (date.getUTCMonth()+1)+'/'+date.getUTCDate();
 };
 const homeHalf=c=>c.cup===0?'夏':'秋';
 function groupedLeague(c){
  const league=new NightPennant(c.clubId,3),schedule=league.schedule;
  league.schedule=Array.from({length:15},(_,round)=>{
   const series=Math.floor(round/3),leg=round%3;
   return schedule[series+leg*5].map((f,i)=>({...f,id:'r'+(round+1)+'-'+(i+1),round}));
  });
  return league;
 }
 class CareerLeagues{
  static rounds=ROUNDS;
  static random=random;
  static schoolFixture(c){
   const index=(c.schoolYear-1)*8+c.cup*4+c.round,year='school-'+c.schoolYear;
   const own=NightTeams.all[NightCareer.schools.indexOf(c.school)].id;
   const opponent=NightTeams.all.filter(club=>club.id!==own)[index%5].id;
   const scheduled=SCHOOL_TEAMS[c.round===1?0:1+(index%7)];
   const opponentName=scheduled===c.school?'港南高校':scheduled;
   const strongOpponent=opponentName==='明徳学園'||!!NightCareer.schoolProfiles[opponentName]?.threshold;
   return {id:year+'-'+c.cup+'-'+c.round,school:true,schoolProfile:NightCareer.schoolProfiles[c.school],
    scoutQuality:[.35,.7,1.2,1.6][c.round]+(strongOpponent?.6:0),strongOpponent,index,own,opponent,opponentName,
    type:'school',park:NightPlayers.schoolPark(c.round,c.schoolYear+c.cup),gameName:'高'+c.schoolYear+homeHalf(c)+'・'+ROUNDS[c.round],round:c.round,important:c.round>=1};
  }
  static inningRuns(line,runs,first,last,key){
   const changes=[];
   if(first>last)return changes;
   for(let inning=first;inning<=last;inning++)line[inning-1]??=0;
   const rng=random(key);
   for(let i=0;i<runs;i++){
    const inning=first+Math.floor(rng()*(last-first+1));
    line[inning-1]++;
    const event=changes.find(r=>r.inning===inning);
    if(event)event.runs++;
    else changes.push({inning,runs:1});
   }
   return changes.sort((a,b)=>a.inning-b.inning);
  }
  static missingRuns(line,total){
   return Math.max(0,total-line.reduce((sum,runs)=>sum+(runs||0),0));
  }
  static rallyStrength(h,totalBases,rbi=0){
   return Math.min(3,h*.43+Math.max(0,totalBases-h)*.24+rbi*.13);
  }
  static rallyRuns(rng,strength,atBats){
   let hits=0,runs=0;
   for(let i=0;i<atBats;i++){
    const chance=rng(),converts=rng();
    if(chance<.045*strength){
     hits++;
     if(converts<.46)runs++;
    }
   }
   return {hits,runs};
  }
  static league(c){
   if(!c.clubId)return null;
   if(c.league)return c.league;
   const l=c.gameNumber?new NightPennant(c.clubId,2):groupedLeague(c);
   l.id=c.seed+'/league/'+c.proYear;
   for(let i=0;i<Math.min(10,c.gameNumber);i++){
    l.completeRound(l.simulate(l.fixture));
    if(!l.completed)l.next();
   }
   c.league=l;
   return l;
  }
  static proFixture(c){
   const l=this.league(c);
   if(!l||l.completed&&!l.postseason||l.postseasonCompleted||!l.userInActiveFixture)return null;
   const f=l.activeFixture,opponent=f.home===c.clubId?f.away:f.home,playoff=!!f.playoff;
   return {id:'pro-'+c.proYear+'-'+(playoff?f.id:c.gameNumber),own:c.clubId,opponent,leagueId:f.id,
    ownHome:f.home===c.clubId,index:(c.proYear-1)*l.totalGames+c.gameNumber+(f.game||0),
    seriesGame:!playoff&&l.gamesPerOpponent===3?c.gameNumber%3+1:null,
    opponentName:NightTeams.get(opponent).name,type:playoff?'playoffs':'pro',
    gameName:playoff?(f.series==='final'?'台湾シリーズ':'プレーオフ')+' 第'+f.game+'戦':
     c.level==='trainee'?'育成練習試合':c.level==='farm'?'二軍公式戦':'一軍公式戦',
    important:playoff||c.gameNumber===l.totalGames-1};
  }
  static apbcFixture(c){
   const t=c.apbc,f=t?.active;
   if(!f)return null;
   const own=t.team,opponent=f.home===own?f.away:f.home;
   return {id:'apbc-'+c.proYear+'-'+f.id,index:t.day,own,opponent,ownHome:f.home===own,
    opponentName:NightTeams.get(opponent).name,type:'apbc',leagueId:f.id,important:true,
    gameName:t.day===3?(f.slot===1?'APBC 決勝':'APBC 3位決定戦'):'APBC 予選第'+(t.day+1)+'戦'};
  }
  static calendar(c,f=c.fixture){
   if(c.stage==='overseas'||c.stage==='overseas-result'){
    const {abroad}=c,rows=NightCareerLife.foreignSchedule(abroad).map(({date,club},i)=>({
     date,opponent:club.name,result:abroad.results?.[i]
    }));
    const played=Math.min(rows.length,abroad.played??(c.stage==='overseas-result'?rows.length:0));
    return {label:abroad.phase==='trial'?'海外キャンプ':'海外リーグ',rows,played,total:rows.length,next:rows[played]?.date};
   }
   if(!f)return null;
   if(f.school){
    const dates=c.cup===0?['7/12','7/19','8/16','8/18']:['9/13','9/20','10/11','10/13'];
    const [month,day]=dates[c.round].split('/').map(Number);
    return {label:(c.cup===0?'夏':'秋')+'大会',played:c.round,total:ROUNDS.length,limit:true,
     next:f.type==='school-tryout'?matchDate(month,day,-3):dates[c.round]};
   }
   if(f.type==='academy')return {label:'ドラフト選考試合',played:c.academy.played,total:3,next:matchDate(9,20,c.academy.played*7)};
   if(f.type==='apbc')return {label:'APBC',played:c.apbc.day,total:4,next:matchDate(11,12,c.apbc.day)};
   if(f.type==='playoffs'){
    const series=c.league.activeSeries,played=series.games.length,total=series.target*2-1;
    return {label:series.id==='final'?'台湾シリーズ':'プレーオフ',played,total,limit:true,next:matchDate(10,series.id==='final'?17:4,played*2)};
   }
   if(f.type==='pro'){
    const league=c.league,total=league.totalGames;
    const rows=league.schedule.map((fixtures,i)=>{
     const game=fixtures.find(g=>g.home===c.clubId||g.away===c.clubId);
     const date=matchDate(3,27,league.gamesPerOpponent===3?Math.floor(i/3)*45+i%3:Math.round(i*182/(total-1)));
     return {date,opponent:NightTeams.get(game.home===c.clubId?game.away:game.home).name};
    });
    const played=league.played;
    return {label:'レギュラーシーズン',rows,played,total,next:rows[played]?.date};
   }
   return null;
  }
  static teamScore(c,f,stats,partial=null){
   if(partial?.completedGame){
    const {own,opp,inning,homeLine,awayLine,teammateHits,actualHome}=partial;
    return {own,opp,won:own>opp,extra:inning>9,teammateHits,actualHome,
     line:{home:homeLine.slice(),away:awayLine.slice(),unknown:{home:0,away:0}}};
   }
   const rng=random(c.seed+'/'+f.id+'/score'),played=f.firstTeam||f.school||['pro','apbc','academy','overseas'].includes(f.type);
   const opponentStrength=f.type==='school-tryout'?-.5:f.school?[-.12,.42,.85,1.15][c.round]:f.type==='overseas'?.68:0;
   const schoolStrength= -opponentStrength+(f.school?(c.schoolYear-1)*.18:0);
   const remaining=partial?Math.max(0,(9-partial.inning)/9):1;
   const team=f.school?NightCareer.schoolProfiles[c.school]:null;
   // Only simulate innings still unplayed. In played games the earlier edge is in the scoreboard.
   let home=(partial?.own??0)+poisson(rng,(3.1+schoolStrength+(team?.attack||0)+(window.NightCareerExtras?.teamTraining(c)||0)*.11)*remaining);
   let away=(partial?.opp??0)+poisson(rng,(3.5-schoolStrength-(team?.defense||0))*remaining);
   if(played&&!partial){
    if(c.pitching){
     away=Math.max(0,away-Math.round(stats.outs/7))+stats.allowed;
    }else home+=stats.rbi+Math.round(Math.max(0,stats.h+stats.bb-stats.rbi)*.38);
   }
   let teammateHits=partial?.teammateHits||0;
   if(team?.weak&&f.type==='school'&&!c.pitching){
    const strength=partial?partial.rally||0:this.rallyStrength(stats.h,stats.tb,stats.rbi);
    const atBats=partial?Math.ceil(9*remaining)+Math.max(0,3-(partial.outs||0)):12;
    const late=(!partial||partial.inning<9||partial.own<=partial.opp)&&this.rallyRuns(random(c.seed+'/'+f.id+'/rally/end'),strength,atBats);
    home+=late?.runs||0;
    teammateHits+=late?.hits||0;
   }
   if(played&&(!partial||remaining>0))away+=stats.errors;
   const finalRuns={home:home-(partial?.own??0),away:away-(partial?.opp??0)};
   const extra=home===away;
   if(extra){
    if(rng()<(f.school?.52-opponentStrength*.11+((team?.attack||0)+(team?.defense||0))*.045:.5))home++;
    else away++;
   }
   const homeLine=partial?.homeLine?.slice()||Array(9).fill(null);
   const awayLine=partial?.awayLine?.slice()||Array(9).fill(null);
   const unknown={home:partial?this.missingRuns(homeLine,partial.own):0,away:partial?this.missingRuns(awayLine,partial.opp):0};
   const last=partial?.inning||1,homeStarts=partial?.half==='bottom'&&partial.outs>=3?last+1:last;
   const homeEnds=home>away&&home-finalRuns.home>away&&partial?.half==='top'&&homeLine[8]==null?8:9;
   this.inningRuns(homeLine,finalRuns.home,Math.min(9,homeStarts),finalRuns.home?9:homeEnds,c.seed+'/'+f.id+'/home-finish');
   this.inningRuns(awayLine,finalRuns.away,Math.min(9,partial?last+1:1),9,c.seed+'/'+f.id+'/away-finish');
   if(partial?.homeLine){
    for(let i=0;i<last-1;i++){
     if(!unknown.home)homeLine[i]??=0;
     if(!unknown.away)awayLine[i]??=0;
    }
   }
   if(extra){
    awayLine[9]=away-(partial?.opp??0)-finalRuns.away;
    homeLine[9]=home-(partial?.own??0)-finalRuns.home;
   }
   return {own:home,opp:away,won:home>away,extra,teammateHits,line:{home:homeLine,away:awayLine,unknown},
    addedOwn:partial?home-partial.own:0,addedOpp:partial?away-partial.opp:0,
    lastInning:partial?.inning??null};
  }
  static leagueScore(f,score){
   return {homeScore:f.ownHome?score.own:score.opp,awayScore:f.ownHome?score.opp:score.own};
  }
  static advanceLeague(c,f,score){
   const l=this.league(c);
   const fixture=l.activeFixture;
   const inFirstTeam=f.firstTeam||f.type==='playoffs';
   if(!fixture.playoff){
    const farm=c.farmLeague||=new NightPennant(c.clubId,l.gamesPerOpponent);
    if(!farm.played)farm.schedule=l.schedule;
    farm.id=c.seed+'/farm/'+c.proYear;
    while(farm.round<l.round&&!farm.completed){
     farm.completeRound(farm.simulate(farm.fixture));
     if(!farm.completed)farm.next();
    }
    farm.completeRound(inFirstTeam?farm.simulate(farm.fixture):this.leagueScore(f,score));
    if(!farm.completed)farm.next();
   }
   l.completeActiveGame(inFirstTeam?this.leagueScore(f,score):l.simulate(fixture));
   if(!l.regularCompleted){l.next();return false;}
   if(!l.postseason)l.startPlayoffs();
   while(!l.postseasonCompleted){
    if(l.postseason.awaitingNext)l.nextPlayoff();
    if(l.userInActiveFixture)return false;
    l.simulatePlayoffGame();
   }
   return true;
  }
  static advanceAPBC(c,f,score){
   const t=c.apbc;
   return t.complete({phase:'ended',apbcFixtureId:f.leagueId,inning:9,
    teams:{home:{id:t.active.home},away:{id:t.active.away}},...this.leagueScore(f,score)},null);
  }
 }
 window.NightCareerLeagues=CareerLeagues;
})();
