/* Timed knockout format based on the 2026 NPB All-Star Home Run Derby. */
(()=>{
 const ROUND_NAMES=['準々決勝','準決勝','決勝'];
 const numberOfHomers=p=>p.stats?.hr??0;
 const pairOrder=[0,7,3,4,1,6,2,5];
 const drawFirst=()=>Math.random()<.5?0:1;
 window.NightDerby=class NightDerby{
  constructor(club,batter,park,options={}){
   this.park=park;
   this.enhanced=!!options.enhanced;this.mode=options.mode||'tournament';this.history=[];this.turnHistory=[];this.streak=0;this.bestStreak=0;this.counted=false;
   if(['record','simulation','online'].includes(this.mode)){this.remaining=120000;this.turnHR=0;this.round=0;this.extra=false;this.rounds=[];this.over=false;return;}

   const clubs=club.id.startsWith('apbc-')&&this.mode!=='international'
    ?NightTeams.international.map(team=>NightAPBCTournament.club(team.id)):(this.enhanced?(NightTeams.matchTeams||NightTeams.all):NightTeams.all);
   const leagueOf=c=>c.id.startsWith('npb-')?'npb':c.id.startsWith('kbo-')?'kbo':c.id.startsWith('apbc-')?'apbc':'cpbl';
   const scope=this.enhanced&&this.mode!=='international'?(options.league||leagueOf(club)):'all';
   const eligible=scope==='all'?clubs:clubs.filter(c=>leagueOf(c)===scope);
   const pool=(eligible.length?eligible:clubs).flatMap(team=>team.batters.map(player=>({club:team,player})))
    .filter(({club:team,player})=>team.id!==club.id||player.id!==batter.id)
    .sort((a,b)=>b.player.power-a.player.power||numberOfHomers(b.player)-numberOfHomers(a.player))
    .slice(0,this.enhanced?Infinity:7);
   let cpu=pool;
   if(this.enhanced){const selected=(options.entrants||[]).map(e=>{const team=clubs.find(c=>c.id===e.clubId),player=team?.batters.find(p=>p.id===e.playerId);return player?{club:team,player}:null;}).filter(Boolean).filter(e=>e.club.id!==club.id||e.player.id!==batter.id);const used=new Set();cpu=[];for(const e of selected){const key=e.club.id+'/'+e.player.id;if(!used.has(key)&&cpu.length<7){used.add(key);cpu.push(e);}}const shortlist=pool.slice(0,Math.max(35,Math.ceil(pool.length*.08))).filter(e=>!used.has(e.club.id+'/'+e.player.id));if(this.mode==='international'){for(const league of ['npb','cpbl','kbo']){if(cpu.length>=7||leagueOf(club)===league||cpu.some(e=>leagueOf(e.club)===league))continue;const choices=pool.filter(e=>leagueOf(e.club)===league&&!used.has(e.club.id+'/'+e.player.id)).slice(0,24);if(choices.length){const e=choices[Math.floor(Math.random()*choices.length)];cpu.push(e);used.add(e.club.id+'/'+e.player.id);}}}while(cpu.length<7&&shortlist.length){const e=shortlist.splice(Math.floor(Math.random()*shortlist.length),1)[0];if(!used.has(e.club.id+'/'+e.player.id)){cpu.push(e);used.add(e.club.id+'/'+e.player.id);}}for(const e of pool){if(cpu.length>=7)break;if(!cpu.some(p=>p.club.id===e.club.id&&p.player.id===e.player.id))cpu.push(e);}}
   const seeds=[{club,player:batter,user:true},...cpu].sort((a,b)=>numberOfHomers(b.player)-numberOfHomers(a.player)||b.player.power-a.player.power||a.player.id.localeCompare(b.player.id));
   const draw=pairOrder.map(i=>({...seeds[i],seed:i+1,user:seeds[i].user===true}));
   this.rounds=[Array.from({length:4},(_,i)=>this.match(0,draw[i*2],draw[i*2+1])),[],[]];
   this.round=0;this.matchup=null;this.over=false;
   this.advance();
  }
  match(round,a,b){
   return {round,entrants:[a,b],first:drawFirst(),extraFirst:null,normal:[null,null],extra:[null,null],winner:null,complete:false,reason:null};
  }
  get label(){if(this.mode==='record')return '記録挑戦';if(this.mode==='online')return 'オンライン対戦';return ROUND_NAMES[this.matchup?.round??this.round];}
  get opponent(){return this.matchup.entrants[1-this.userIndex];}
  get userIndex(){return this.matchup.entrants.findIndex(p=>p.user);}
  get score(){return this.extra?this.matchup.extra:this.matchup.normal;}
  get userBatsSecond(){return (this.extra?this.matchup.extraFirst:this.matchup.first)!==this.userIndex;}
  get clinched(){
   if(this.mode==='online')return Number.isFinite(this.target)&&this.turnHR>this.target;
   if(this.mode!=='tournament'&&this.mode!=='international')return false;
   const opponentScore=this.score[1-this.userIndex];
   return this.userBatsSecond&&Number.isFinite(opponentScore)&&this.turnHR>opponentScore;
  }
  cpuScore(entry,extra,scoreToBeat=Infinity){
   if(this.enhanced&&this.matchup?.entrants.includes(entry)&&!entry.user&&typeof NightGame!=='undefined'){
    const clips=NightDerby.simulateTurn(entry,this.park,extra?60000:120000,scoreToBeat);
    const key=extra?'extraClips':'normalClips';this.matchup[key]=clips;
    return clips.filter(b=>b.result?.hr).length;
   }
   const size=(this.park.leftCenter+this.park.rightCenter)/2;
   const chance=Math.max(.1,Math.min(.52,.24+(entry.player.power-70)*.009-(size-112)*.012-((this.park.wallHeight||2.8)-2.8)*.028));
   let homeRuns=0;
   for(let i=0;i<(this.enhanced?(extra?40:80):(extra?10:20))&&homeRuns<=scoreToBeat;i++)if(Math.random()<chance*(this.enhanced?.65:1))homeRuns++;
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
  simulatePair(match,extra){
   const first=extra?match.extraFirst:match.first,second=1-first;
   const scores=extra?match.extra:match.normal;
   scores[first]=this.cpuScore(match.entrants[first],extra);
   scores[second]=this.cpuScore(match.entrants[second],extra,scores[first]);
  }
  simulate(match){
   this.simulatePair(match,false);
   if(match.normal[0]===match.normal[1]){
    match.extraFirst=drawFirst();
    this.simulatePair(match,true);
   }
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
   this.turnHR=0;this.turnHistory=[];this.streak=0;this.pendingFinish=false;
   if(this.userBatsSecond)this.score[1-this.userIndex]=this.cpuScore(this.opponent,this.extra);
  }
  finishTurn(){
   if(this.mode==='record'){this.over=true;return 'finish';}
   this.score[this.userIndex]=this.turnHR;
   const opponentIndex=1-this.userIndex;
   if(this.score[opponentIndex]===null)this.score[opponentIndex]=this.cpuScore(this.opponent,this.extra,this.turnHR);
   if(!this.extra&&this.score[0]===this.score[1])return 'extra';
   this.resolve(this.matchup);
   if(this.matchup.winner?.user&&this.round<2)return 'round';
   this.playedMatch=this.matchup;
   this.advance();
   this.matchup=this.playedMatch;
   return 'finish';
  }
  record(result){
   const item={...result,round:this.round,extra:!!this.extra};this.history.push(item);this.turnHistory.push(item);
   this.streak=item.hr?this.streak+1:0;this.bestStreak=Math.max(this.bestStreak,this.streak);
   return item;
  }
  static simulateTurn(entry,park,duration,target=Infinity){
   const g=new NightGame('derby','standard',()=>{},{clubs:{home:entry.club,away:entry.club},park:park.id,parkDefinition:park,practiceBatter:entry.player.id,crowdAttendance:'full',weather:'clear',wind:0,derby:{enhanced:true,mode:'simulation'}});
   const clips=[];let used=0,hr=0;
   while(used<duration&&hr<=target&&clips.length<120){
    const pitch={x:(Math.random()-.5)*.9,y:Math.random()*.49-.13};g.createPitch(NightGame.TYPES[0],pitch);
    const q=Math.random(),power=entry.player.power||65;
    const speed=29+q*19+(power-60)*.12+Math.random()*5,launch=12+Math.random()*32,spray=(Math.random()-.5)*1.65;
    const shot={speed,launch,spray,pitch};g.startField(speed,launch,spray,true,q>.85);
    let elapsed=0;while(g.phase==='field'&&elapsed<12000){g.updateField(1/60);elapsed+=1000/60;}
    const result=g.derby.turnHistory.at(-1)||{hr:false,kind:'in-play',distance:0};if(result.hr)hr++;
    clips.push({...shot,result});used+=(g.pitch?.duration||900)*1.12+270;
    g.derby.turnHistory=[];g.derby.pendingFinish=false;
   }
   return clips;
  }
  continue(kind){
   if(kind==='extra'){this.extra=true;this.matchup.extraFirst=drawFirst();this.prepareTurn();}
   else if(kind==='round')this.advance();
  }
 };
})();
