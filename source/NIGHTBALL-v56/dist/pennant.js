/* Configurable round-robin seasons for CPBL, NPB and KBO. */
(()=>{
 'use strict';
 const P=NightPlayers;
 // IDs are retained so existing seasons and custom orders continue to load.
 const definitions=[
  ['owls','中信兄弟','兄弟','brothers','#f4bd13','#14263e','つなぐ打線','巧打とスピードで、一点をもぎ取る。','night'],
  ['foxes','味全ドラゴンズ','味全','dragons','#c40020','#fff0e4','攻守のバランス','厚い中軸と多彩な変化球を備える。','brick'],
  ['falcons','統一ライオンズ','統一','lions','#ee7f19','#fff4d2','最速の機動力','俊足の走者と広い守備範囲が武器。','sky'],
  ['mariners','富邦ガーディアンズ','富邦','guardians','#004b8d','#d5eeff','精密な野球','高い制球力と巧打で試合を組み立てる。','harbor'],
  ['wolves','樂天モンキーズ','樂天','monkeys','#790826','#ffe0bb','鉄壁の守り','強肩と守備力で、最後のアウトを奪う。','dome'],
  ['comets','台鋼ホークス','台鋼','hawks','#006043','#e7c36a','一発の破壊力','長打力のある打線と剛腕で押し切る。','river']
 ];
 const clubs=definitions.map(([id,name,mark,asset,color,accent,tag,description,park])=>({id,name,short:name,mark,logo:`./assets/clubs/${asset}.png`,color,accent,tag,description,park,...P.rosters[id]}));
 window.NightTeams={all:clubs,get:id=>clubs.find(c=>c.id===id)||clubs[0]};
 const leagues={cpbl:'CPBL',npb:'NPB',kbo:'KBO'};
 const clubsFor=id=>Object.hasOwn(leagues,id)?id==='cpbl'?clubs:NightTeams[id]||[]:[];
 const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
 const random=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 class NightPennant{
  static leagues=leagues;
  static clubsFor=clubsFor;
  constructor(clubId,gamesPerOpponent=4){
   const leagueId=Object.keys(leagues).find(id=>clubsFor(id).some(c=>c.id===clubId));
   if(!leagueId)throw Error('Unknown club');
   if(!Number.isInteger(gamesPerOpponent)||gamesPerOpponent<1||gamesPerOpponent>10)throw Error('Choose 1–10 games per opponent');
   this.schema=3;this.leagueId=leagueId;this.gamesPerOpponent=gamesPerOpponent;this.id=Date.now().toString(36)+Math.random().toString(36).slice(2,7);this.clubId=clubId;this.round=0;this.results={};this.currentGame=null;this.postseason=null;this.createdAt=new Date().toISOString();
   const rotation=this.clubs.map(c=>c.id),base=[],rounds=rotation.length-1;
   for(let r=0;r<rounds;r++){
    const pairs=[];
    for(let i=0;i<rotation.length/2;i++){
     const a=rotation[i],b=rotation[rounds-i];
     pairs.push((r+i)%2?[b,a]:[a,b]);
    }
    base.push(pairs);rotation.splice(1,0,rotation.pop());
   }
   this.schedule=Array.from({length:gamesPerOpponent*rounds},(_,r)=>{
    const reverse=Math.floor(r/rounds)%2;
    return base[r%rounds].map(([h,a],i)=>({id:`r${r+1}-${i+1}`,round:r,home:reverse?a:h,away:reverse?h:a}));
   });
  }
  static restore(s){
   if(![1,2,3].includes(s?.schema)||!Array.isArray(s.schedule))return null;
   const leagueId=s.schema<3?'cpbl':s.leagueId,count=s.schema===1?4:s.gamesPerOpponent;
   const clubIds=new Set(clubsFor(leagueId).map(c=>c.id)),size=clubIds.size;
   if(!clubIds.has(s.clubId)||!Number.isInteger(count)||count<1||count>10||
    s.schedule.length!==count*(size-1)||!Number.isInteger(s.round)||s.round<0||s.round>=s.schedule.length)return null;
   for(const round of s.schedule){
    if(!Array.isArray(round)||round.length!==size/2)return null;
    const playing=new Set(round.flatMap(f=>[f?.home,f?.away]));
    if(playing.size!==size||[...playing].some(id=>!clubIds.has(id)))return null;
   }
   const p=Object.assign(Object.create(NightPennant.prototype),s,{schema:3,leagueId,gamesPerOpponent:count});
   p.results ||= {};p.postseason ||= null;if(p.postseason&&!p.validPostseason())return null;return p;
  }
  get totalGames(){return this.schedule.length;}
  get clubs(){return clubsFor(this.leagueId);}
  get club(){return NightTeams.get(this.clubId);}
  get fixture(){return this.schedule[this.round].find(f=>[f.home,f.away].includes(this.clubId));}
  get roundDone(){return !!this.results[this.fixture.id];}
  get completed(){return this.round===this.totalGames-1&&this.roundDone;}
  get played(){return Object.values(this.results).filter(r=>[r.home,r.away].includes(this.clubId)).length;}
  next(){if(!this.roundDone||this.completed)return false;this.round++;this.currentGame=null;return true;}
  completeRound(score){
   const f=this.fixture;if(this.roundDone)return false;
   if(!Number.isInteger(score.homeScore)||!Number.isInteger(score.awayScore)||score.homeScore<0||score.awayScore<0||score.homeScore===score.awayScore)throw Error('A pennant game needs a winner');
   this.results[f.id]={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning||1,home: f.home,away:f.away};
   for(const other of this.schedule[this.round])if(other.id!==f.id)this.results[other.id]={...other,...this.simulate(other)};
   this.currentGame=null;return true;
  }
  // Regular season records remain separate from postseason games.
  get regularCompleted(){return this.completed;}
  get activeSeries(){return this.postseason?(this.postseason.stage==='qualifier'?this.postseason.qualifier:this.postseason.final):null;}
  get activeFixture(){
   if(!this.postseason)return this.fixture;
   const series=this.activeSeries;if(!series)return null;
   if(this.postseason.awaitingNext||series.winner)return series.games.at(-1)||null;
   const index=series.games.length,upperHome=series.id==='qualifier'?[true,false,true][index]:[true,true,false,false,true,false,true][index];
   return {id:'po-'+series.id+'-'+(index+1),home:upperHome?series.higher:series.lower,away:upperHome?series.lower:series.higher,playoff:true,series:series.id,game:index+1};
  }
  get activeResult(){if(!this.postseason)return this.results[this.fixture.id]||null;return this.activeSeries?.games.find(g=>g.id===this.activeFixture?.id)||null;}
  get activeRoundDone(){return this.postseason?!!this.activeResult:this.roundDone;}
  get postseasonCompleted(){return this.postseason?.stage==='complete';}
  get userInActiveFixture(){const f=this.activeFixture;return !!f&&[f.home,f.away].includes(this.clubId);}
  playoffSeeds(){
   const rows=this.standings();
   const direct=(a,b)=>Object.values(this.results).filter(g=>[g.home,g.away].includes(a)&&[g.home,g.away].includes(b)).reduce((sum,g)=>sum+((g.homeScore>g.awayScore?g.home:g.away)===a?1:-1),0);
   // Reuse league ranking, resolve a completely tied cutoff by head-to-head, runs scored, then club order.
   const order=this.clubs.map(c=>c.id);
   rows.sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.diff-a.diff||-direct(a.id,b.id)||b.for-a.for||order.indexOf(a.id)-order.indexOf(b.id));
   return rows.slice(0,3).map((r,i)=>({clubId:r.id,seed:i+1}));
  }
  startPlayoffs(){
   if(!this.regularCompleted||this.postseason)return false;
   const seeds=this.playoffSeeds(),make=(id,higher,lower,target)=>({id,higher,lower,target,wins:{[higher]:0,[lower]:0},games:[],winner:null});
   this.postseason={schema:1,seeds,stage:'qualifier',qualifier:make('qualifier',seeds[1].clubId,seeds[2].clubId,2),final:null,awaitingNext:false,champion:null};this.currentGame=null;return true;
  }
  completeActiveGame(score){return this.postseason?this.completePlayoffGame(score):this.completeRound(score);}
  completePlayoffGame(score){
   if(!this.postseason||this.postseasonCompleted||this.postseason.awaitingNext)return false;
   const f=this.activeFixture,series=this.activeSeries;
   if(!f||![score.homeScore,score.awayScore].every(n=>Number.isInteger(n)&&n>=0)||score.homeScore===score.awayScore)throw Error('A playoff game needs a winner');
   if(score.leagueFixtureId&&score.leagueFixtureId!==f.id)return false;
   if(score.teams&&(score.teams.home.id!==f.home||score.teams.away.id!==f.away))return false;
   const result={...f,homeScore:score.homeScore,awayScore:score.awayScore,innings:score.inning||score.innings||1},winner=score.homeScore>score.awayScore?f.home:f.away;
   series.games.push(result);series.wins[winner]++;if(series.wins[winner]>=series.target)series.winner=winner;
   this.postseason.awaitingNext=true;this.currentGame=null;
   if(series.id==='final'&&series.winner){this.postseason.stage='complete';this.postseason.champion=series.winner;}
   return true;
  }
  nextPlayoff(){
   const p=this.postseason;if(!p||!p.awaitingNext||this.postseasonCompleted)return false;
   if(p.stage==='qualifier'&&p.qualifier.winner){const higher=p.seeds[0].clubId,lower=p.qualifier.winner;p.final={id:'final',higher,lower,target:4,wins:{[higher]:0,[lower]:0},games:[],winner:null};p.stage='final';}
   p.awaitingNext=false;this.currentGame=null;return true;
  }
  simulatePlayoffGame(){
   if(!this.postseason||this.postseasonCompleted||this.activeRoundDone||this.userInActiveFixture)return false;
   return this.completePlayoffGame(this.simulate(this.activeFixture));
  }
  validPostseason(){
   const p=this.postseason;if(p.schema!==1||!this.regularCompleted||!Array.isArray(p.seeds)||p.seeds.length!==3||new Set(p.seeds.map(s=>s.clubId)).size!==3||p.seeds.some((s,i)=>s.seed!==i+1||!this.clubs.some(c=>c.id===s.clubId))||!['qualifier','final','complete'].includes(p.stage)||typeof p.awaitingNext!=='boolean')return false;
   const valid=(s,id,target,higher,lower)=>{
    if(!s||s.id!==id||s.target!==target||s.higher!==higher||s.lower!==lower||higher===lower||!Array.isArray(s.games)||s.games.length>target*2-1)return false;
    const counts={[higher]:0,[lower]:0};let won=null;
    for(const [i,g]of s.games.entries()){
     const upper=id==='qualifier'?[true,false,true][i]:[true,true,false,false,true,false,true][i],home=upper?higher:lower,away=upper?lower:higher;
     if(won||g.id!=='po-'+id+'-'+(i+1)||g.home!==home||g.away!==away||![g.homeScore,g.awayScore].every(n=>Number.isInteger(n)&&n>=0)||g.homeScore===g.awayScore)return false;
     const winner=g.homeScore>g.awayScore?g.home:g.away;if(++counts[winner]===target)won=winner;
    }
    return s.wins?.[higher]===counts[higher]&&s.wins?.[lower]===counts[lower]&&s.winner===won;
   };
   if(!valid(p.qualifier,'qualifier',2,p.seeds[1].clubId,p.seeds[2].clubId))return false;
   if(p.stage==='qualifier')return !p.final&&!p.champion&&(!p.qualifier.winner||p.awaitingNext);
   if(!p.qualifier.winner||!valid(p.final,'final',4,p.seeds[0].clubId,p.qualifier.winner))return false;
   return p.stage==='complete'?p.champion===p.final.winner&&!!p.champion&&p.awaitingNext:!p.champion&&!p.final.winner;
  }
  simulate(f){
   const rand=random(hash(this.id+'/'+f.id)),orders={home:0,away:0},scores={home:0,away:0};let innings=0;
   // Every half begins with two outs and three automatic runners, including extras.
   const half=(side)=>{
    const hitters=NightTeams.get(f[side]).batters.slice(0,9),pitcher=NightTeams.get(f[side==='home'?'away':'home']).pitchers[Math.min(2,Math.floor((innings-1)/3))];
    let bases=[true,true,true];
    for(;;){const b=hitters[orders[side]++%9],v=rand(),walk=.07+(80-pitcher.control)*.0006,hit=.24+(b.contact-75)*.002+(145-pitcher.velocity)*.001,hr=.017+Math.max(0,b.power-65)*.001;
     if(v<walk){if(bases.every(Boolean))scores[side]++;if(bases[0]&&bases[1])bases[2]=true;if(bases[0])bases[1]=true;bases[0]=true;}
     else if(v<walk+hit){const n=v<walk+hr?4:rand()<.20?2:rand()<.025?3:1;for(let i=2;i>=0;i--)if(bases[i]){bases[i]=false;if(i+n>=3)scores[side]++;else bases[i+n]=true;}if(n===4)scores[side]++;else bases[n-1]=true;if(side==='home'&&n!==4&&scores.home>scores.away)scores.home=scores.away+1;}
     else break; // The next out ends this half.
     if(side==='home'&&scores.home>scores.away)break;
    }
   };
   do{innings++;half('away');half('home');}while(scores.home===scores.away);
   return {homeScore:scores.home,awayScore:scores.away,innings};
  }
  standings(){
   const order=this.clubs.map(c=>c.id);
   const rows=order.map(id=>({id,played:0,wins:0,losses:0,for:0,against:0}));
   const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
   Object.values(this.results).forEach(g=>{const h=byId[g.home],a=byId[g.away];h.played++;a.played++;h.for+=g.homeScore;h.against+=g.awayScore;a.for+=g.awayScore;a.against+=g.homeScore;if(g.homeScore>g.awayScore){h.wins++;a.losses++;}else{a.wins++;h.losses++;}});
   rows.forEach(r=>{r.pct=r.played?r.wins/r.played:0;r.diff=r.for-r.against;});
   rows.sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.diff-a.diff||order.indexOf(a.id)-order.indexOf(b.id));
   rows.forEach((r,i)=>{const prev=rows[i-1];r.rank=prev&&r.wins===prev.wins&&r.losses===prev.losses&&r.diff===prev.diff?prev.rank:i+1;r.behind=((rows[0].wins-r.wins)+(r.losses-rows[0].losses))/2;});return rows;
  }
 }
 window.NightPennant=NightPennant;
})();
