/* Timed knockout format based on the 2026 NPB All-Star Home Run Derby. */
(()=>{
 const ROUND_NAMES=['準々決勝','準決勝','決勝'];
 const numberOfHomers=p=>p.stats?.hr??0;
 const pairOrder=[0,7,3,4,1,6,2,5];
 window.NightDerby=class NightDerby{
  constructor(club,batter,park){
   this.park=park;
   const clubs=club.id.startsWith('apbc-')
    ?NightTeams.international.map(team=>NightAPBCTournament.club(team.id)):NightTeams.all;
   const cpu=clubs.flatMap(team=>team.batters.map(player=>({club:team,player})))
    .filter(({club:team,player})=>team.id!==club.id||player.id!==batter.id)
    .sort((a,b)=>b.player.power-a.player.power||numberOfHomers(b.player)-numberOfHomers(a.player))
    .slice(0,7);
   const seeds=[{club,player:batter,user:true},...cpu].sort((a,b)=>numberOfHomers(b.player)-numberOfHomers(a.player)||b.player.power-a.player.power||a.player.id.localeCompare(b.player.id));
   const draw=pairOrder.map(i=>({...seeds[i],seed:i+1,user:seeds[i].user===true}));
   this.rounds=[Array.from({length:4},(_,i)=>this.match(0,draw[i*2],draw[i*2+1])),[],[]];
   this.round=0;this.matchup=null;this.over=false;
   this.advance();
  }
  match(round,a,b){return {round,entrants:[a,b],normal:[null,null],extra:[null,null],winner:null,complete:false,reason:null};}
  get label(){return ROUND_NAMES[this.matchup?.round??this.round];}
  get opponent(){return this.matchup.entrants[1-this.userIndex];}
  get userIndex(){return this.matchup.entrants.findIndex(p=>p.user);}
  get score(){return this.extra?this.matchup.extra:this.matchup.normal;}
  cpuScore(entry,extra){
   const size=(this.park.leftCenter+this.park.rightCenter)/2;
   const chance=Math.max(.1,Math.min(.52,.24+(entry.player.power-70)*.009-(size-112)*.012-((this.park.wallHeight||2.8)-2.8)*.028));
   let homeRuns=0;
   for(let i=0;i<(extra?10:20);i++)if(Math.random()<chance)homeRuns++;
   return homeRuns;
  }
  resolve(match){
   const [a,b]=match.normal,[x,y]=match.extra;
   if(a!==b){match.winner=match.entrants[a>b?0:1];}
   else if(x!==y){match.winner=match.entrants[x>y?0:1];match.reason='延長';}
   else if(match.round===2&&a===0&&x===0){match.reason='引き分け';}
   else{match.winner=match.entrants[match.entrants[0].seed<match.entrants[1].seed?0:1];match.reason='同数・シード順';}
   match.complete=true;
  }
  simulate(match){
   match.normal=match.entrants.map(p=>this.cpuScore(p,false));
   if(match.normal[0]===match.normal[1])match.extra=match.entrants.map(p=>this.cpuScore(p,true));
   this.resolve(match);
  }
  advance(){
   const matches=this.rounds[this.round];
   for(const match of matches)if(!match.complete&&!match.entrants.some(p=>p.user))this.simulate(match);
   this.matchup=matches.find(m=>!m.complete);
   if(this.matchup){this.extra=false;this.prepareTurn();return;}
   if(this.round===2){this.over=true;this.champion=matches[0].winner;return;}
   const winners=matches.map(m=>m.winner);
   this.round++;
   this.rounds[this.round]=Array.from({length:winners.length/2},(_,i)=>this.match(this.round,winners[i*2],winners[i*2+1]));
   this.advance();
  }
  prepareTurn(){
   this.remaining=this.extra?60000:120000;
   this.turnHR=0;
   this.score[1-this.userIndex]=this.cpuScore(this.opponent,this.extra);
  }
  finishTurn(){
   this.score[this.userIndex]=this.turnHR;
   if(!this.extra&&this.score[0]===this.score[1])return 'extra';
   this.resolve(this.matchup);
   if(this.matchup.winner?.user&&this.round<2)return 'round';
   this.playedMatch=this.matchup;
   this.advance();
   this.matchup=this.playedMatch;
   return 'finish';
  }
  continue(kind){
   if(kind==='extra'){this.extra=true;this.prepareTurn();}
   else if(kind==='round')this.advance();
  }
 };
})();
