/* Four-team APBC 2026 tournament and pre-tournament roster registration. */
(()=>{
 const teams=['apbc-japan','apbc-taipei','apbc-korea','apbc-australia'];
 const [jpn,tpe,kor,aus]=teams;
 const group=[
  [[aus,kor],[jpn,tpe]],
  [[tpe,aus],[kor,jpn]],
  [[jpn,aus],[tpe,kor]]
 ];
 const same=(a,b)=>a.away===b.away&&a.home===b.home;
 const has=(m,id)=>m.away===id||m.home===id;
 const fixture=(day,slot,away,home)=>({id:day+'-'+slot,day,slot,away,home});
 const officialOrder=club=>[...club.startingOrder.map(id=>club.batters.find(p=>p.id===id)).filter(Boolean),...club.batters.filter(p=>!club.startingOrder.includes(p.id)),...club.pitchers];
 // CPBL roster entries for players recruited from overseas, including local-quota exceptions.
 const overseasPlayers=new Set([
  '羅戈','德保拉','蔣銲','梅賽鍶','鋼龍','伍鐸','魔神龍',
  '布雷克','喬登','髙塩將樹','獅帝芬','魔力藍','鈴木駿輔',
  '威克','威能帝','艾菩樂','魔爾曼','魔鷹','後勁','艾速特','坎南'
 ]);
 const cpblAffiliations={
  中信兄弟:'owls',味全龍:'foxes','統一7-ELEVEn獅':'falcons',
  富邦悍將:'mariners',樂天桃猿:'wolves',台鋼雄鷹:'comets'
 };
 const playerName=name=>name?.normalize('NFKC').replace(/[\s.・．·]/g,'');
 function pool(id){
  const club=NightTeams.get(id);
  const overrides=window.NightAPBCOfficialOverrides?.[id]||{};
  const players=[...officialOrder(club).map(p=>({...p,...overrides[p.name]})),...(club.reserveBatters||[]),...(club.reservePitchers||[]),...(window.NightAPBCCandidates?.[id]||[]).map(p=>({...p}))];
  if(id!==tpe)return players;
  const known=new Map();
  for(const p of players){
   p.sourceClubId=cpblAffiliations[p.club]||NightTeams.all.find(c=>c.short===p.club)?.id;
   known.set(playerName(p.name),p);
   if(p.nativeName)known.set(playerName(p.nativeName),p);
  }
  for(const source of NightTeams.all)for(const p of [...source.batters,...source.pitchers]){
   const name=playerName(p.name),existing=known.get(name);
   if(existing){
    existing.sourceClubId=source.id;existing.club=source.short;
   }else if(!overseasPlayers.has(p.name)){
    const candidate={...p,no:null,sourceClubId:source.id,club:source.short};
    players.push(candidate);known.set(name,candidate);
   }
  }
  return players;
 }
 function official(id){
  const club=NightTeams.get(id),excluded=window.NightAPBCOfficialExclusions?.[id]||[];
  return officialOrder(club).filter(p=>!excluded.includes(p.name)&&!excluded.includes(p.nativeName)).slice(0,28).map(p=>p.id);
 }
 function rosterStatus(id,ids){
  if(!Array.isArray(ids))return {selected:[],batters:0,pitchers:0,valid:false};
  const selected=pool(id).filter(p=>ids.includes(p.id)),batters=selected.filter(p=>p.pos!=='P'),pitchers=selected.length-batters.length;
  return {selected,batters:batters.length,pitchers,valid:selected.length===ids.length&&ids.length<=28&&batters.length>=9&&pitchers>=2&&batters.some(p=>p.pos==='C'||p.positions?.includes('C'))};
 }
 function clubFor(id,ids){
  const club=NightTeams.get(id),{selected,valid}=rosterStatus(id,ids||official(id));
  if(!valid)return club;
  const batters=selected.filter(p=>p.pos!=='P'),pitchers=selected.filter(p=>p.pos==='P');
  const usedNumbers=new Set(selected.filter(p=>Number.isInteger(p.no)||p.no==='00').map(p=>Number(p.no)));
  const players=new Map(selected.map(p=>{
   if(Number.isInteger(p.no)||p.no==='00')return [p.id,p];
   let no=1;while(usedNumbers.has(no))no++;usedNumbers.add(no);return [p.id,{...p,no}];
  }));
  const order=club.startingOrder.filter(pid=>players.has(pid));
  for(const p of batters)if(order.length<9&&!order.includes(p.id))order.push(p.id);
  const fields=Object.fromEntries(Object.entries(club.startingFielding).filter(([pos,pid])=>order.includes(pid)&&(players.get(pid).pos===pos||players.get(pid).positions?.includes(pos)||pos==='DH')));
  // Ensure a natural catcher is in the starting nine when a replacement made the original lineup incomplete.
  if(!order.some(pid=>players.get(pid).pos==='C'||players.get(pid).positions?.includes('C'))){
   const replacement=batters.find(p=>p.pos==='C'||p.positions?.includes('C'));
   const previous=order.at(-1);order[order.length-1]=replacement.id;
   for(const pos of Object.keys(fields))if(fields[pos]===previous)delete fields[pos];
   fields.C=replacement.id;
  }
  return {...club,batters:batters.map(p=>players.get(p.id)),pitchers:pitchers.map(p=>players.get(p.id)),startingOrder:order,startingFielding:fields};
 }
 function ranks(results){
  const rows=teams.map(id=>({id,w:0,l:0,rf:0,ra:0,delta:0,head:0}));
  const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
  for(const m of results.filter(m=>m.day<3)){
   const a=byId[m.away],h=byId[m.home],homeWin=m.homeScore>m.awayScore;
   a.rf+=m.awayScore;a.ra+=m.homeScore;h.rf+=m.homeScore;h.ra+=m.awayScore;
   (homeWin?h:a).w++;(homeWin?a:h).l++;
  }
  for(const row of rows){row.delta=row.rf-row.ra;row.head=results.filter(m=>m.day<3&&has(m,row.id)&&byId[m.away].w===byId[m.home].w&&(m.homeScore>m.awayScore?m.home:m.away)===row.id).length;}
  return rows.sort((a,b)=>b.w-a.w||b.head-a.head||b.delta-a.delta||b.rf-a.rf||a.id.localeCompare(b.id));
 }
 function schedule(results,day){
  if(day<3)return group[day].map(([away,home],slot)=>fixture(day,slot,away,home));
  const rank=ranks(results);
  return [fixture(3,0,rank[3].id,rank[2].id),fixture(3,1,rank[1].id,rank[0].id)];
 }
 function cpuResult(m,innings){
  const strength=id=>{const club=clubFor(id);return club.batters.slice(0,9).reduce((sum,p)=>sum+(p.power+p.contact)/18,0)-club.pitchers.slice(0,3).reduce((sum,p)=>sum+(p.control+p.movement)/12,0);};
  const difference=(strength(m.away)-strength(m.home))/130;
  const runs=chance=>{let total=0;for(let i=0;i<(innings===1?5:15);i++)if(Math.random()<chance)total++;return total;};
  let awayScore=runs(.27+difference),homeScore=runs(.29-difference),played=innings;
  if(awayScore===homeScore){
   const a=runs(.27+difference),h=runs(.29-difference);
   awayScore+=a;homeScore+=h;if(a===h){if(Math.random()<.5)awayScore++;else homeScore++;}played++;
  }
  return {...m,awayScore,homeScore,innings:played};
 }
 window.NightAPBCTournament=class NightAPBCTournament{
  static teams=teams;
  static pool=pool;
  static official=official;
  static rosterStatus=rosterStatus;
  static club=clubFor;
  constructor(team,innings,ids){
   if(!teams.includes(team)||!rosterStatus(team,ids).valid)throw new Error('Invalid APBC roster');
   this.team=team;this.innings=innings===9?9:1;this.roster=ids.slice();
   this.day=0;this.results=[];this.currentGame=null;this.lineup=null;
  }
  static restore(s){
   if(s?.version!==1||!teams.includes(s.team)||![1,9].includes(s.innings)||!Array.isArray(s.roster)||!rosterStatus(s.team,s.roster).valid||!Array.isArray(s.results)||!Number.isInteger(s.day)||s.day<0||s.day>4||s.results.length!==s.day*2)return null;
   const accepted=[];
   for(let day=0;day<s.day;day++){
    const fixtures=schedule(accepted,day);
    for(const m of fixtures){
     const found=s.results.find(r=>r?.id===m.id);
     if(!found||!same(found,m)||found.day!==day||![found.homeScore,found.awayScore].every(n=>Number.isInteger(n)&&n>=0)||found.homeScore===found.awayScore)return null;
     accepted.push({...found,...m});
    }
   }
   const t=new this(s.team,s.innings,s.roster);
   Object.assign(t,{day:s.day,results:accepted,lineup:s.lineup||null});
   if(t.active&&t.active.id===s.currentGame?.state?.apbcFixtureId&&s.currentGame.state.apbcRoster?.team===t.team&&same(t.active,{home:s.currentGame.state.teams?.home?.id,away:s.currentGame.state.teams?.away?.id}))t.currentGame=s.currentGame;
   return t;
  }
  snapshot(){return {version:1,team:this.team,innings:this.innings,roster:this.roster,day:this.day,results:this.results,currentGame:this.currentGame,lineup:this.lineup};}
  get fixtures(){return this.day<4?schedule(this.results,this.day):[];}
  get active(){return this.fixtures.find(m=>has(m,this.team));}
  get standings(){return ranks(this.results);}
  get place(){
   if(this.day<4)return null;
   const medal=this.results.find(m=>m.day===3&&has(m,this.team)),winner=medal.homeScore>medal.awayScore?medal.home:medal.away;
   return (medal.slot===1?1:3)+(winner===this.team?0:1);
  }
  complete(g,report){
   const active=this.active;
   if(!active||active.id!==g.apbcFixtureId||g.phase!=='ended'||g.homeScore===g.awayScore||!same(active,{home:g.teams.home.id,away:g.teams.away.id}))return false;
   this.results.push(...this.fixtures.map(m=>m.id===active.id?{...m,awayScore:g.awayScore,homeScore:g.homeScore,innings:g.inning,report}:cpuResult(m,this.innings)));
   this.day++;this.currentGame=null;return true;
  }
 };
})();
