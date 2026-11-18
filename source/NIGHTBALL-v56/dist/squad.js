/* Roster editor operations share the game's player identities and field positions. */
(()=>{
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
window.NightSquad={
 label:pos=>({P:'投',C:'捕','1B':'一','2B':'二','3B':'三',SS:'遊',LF:'左',CF:'中',RF:'右',DH:'指'}[pos]||pos),
 tone:pos=>pos==='P'?'pitcher':pos==='C'?'catcher':['LF','CF','RF'].includes(pos)?'outfield':pos==='DH'?'dh':'infield',
 overall:p=>Math.round(p.pos==='P'?(p.control*.35+p.stamina*.2+p.movement*.35+(p.velocity-100)*.2):(p.contact*.28+p.power*.22+p.run*.16+p.field*.18+p.arm*.16)),
 normalize(club,config){const players=NightGame.arrangeLineup(club,config.order,config.fielding);config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));return players;},
 swap(club,config,a,b){
  if(a===b||![a,b].every(id=>club.batters.some(p=>p.id===id)))return false;
  this.normalize(club,config);const i=config.order.indexOf(a),j=config.order.indexOf(b);
  if(i<0&&j<0)return false;
  if(i>=0&&j>=0)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];
  else {const old=i>=0?a:b,next=i>=0?b:a;config.order[i>=0?i:j]=next;for(const pos of POS)if(config.fielding[pos]===old)config.fielding[pos]=next;}
  this.normalize(club,config);return true;
 },
 position(club,config,id,pos){
  this.normalize(club,config);const previous=POS.find(key=>config.fielding[key]===id);if(!previous||!POS.includes(pos))return false;
  [config.fielding[previous],config.fielding[pos]]=[config.fielding[pos],config.fielding[previous]];return true;
 },
 reset(club,config){config.order=(club.startingOrder||club.batters.slice(0,9).map(p=>p.id)).slice();config.fielding={...(club.startingFielding||{})};config.pitcher=0;this.normalize(club,config);},
 auto(club,config){
  const used=new Set(),fielding={},selected=[];
  for(const pos of ['C','SS','2B','CF','3B','RF','LF','1B','DH']){
   const pool=club.batters.filter(p=>!used.has(p.id));
   const score=p=>{const natural=p.pos===pos||(p.positions||[]).includes(pos);return p.contact*.32+p.power*.25+p.run*.13+p.field*.2+p.arm*.1+(pos==='DH'?p.power*.3:natural?60:0);};
   pool.sort((a,b)=>score(b)-score(a));const player=pool[0];used.add(player.id);fielding[pos]=player.id;selected.push(player);
  }
  const leadoff=selected.slice().sort((a,b)=>(b.contact+b.run*.6)-(a.contact+a.run*.6))[0],rest=selected.filter(p=>p!==leadoff).sort((a,b)=>(b.contact+b.power*.8)-(a.contact+a.power*.8));
  config.order=[leadoff,...rest].map(p=>p.id);config.fielding=fielding;this.normalize(club,config);
 }
};
})();
