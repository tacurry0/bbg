/* NIGHTBALL NPB 2026 — 12 NPB franchises + Oisix Niigata and Hayate Shizuoka.
 * Non-invasive extension: CPBL NightTeams.all and its six-club pennant stay unchanged.
 * All abilities come from frozen official individual 2026 stat lines in npb-data.js.
 */
(()=>{
 'use strict';
 const input=window.NightNPBData;
 if(!input||!Array.isArray(input.teams)||input.teams.length!==14||!window.NightTeams){
  throw new Error('NPB 2026 data missing or incomplete');
 }
 const cpbl=NightTeams.all;
 const countries=NightTeams.international||[];
 const required=(p,keys)=>keys.every(k=>Number.isFinite(p[k]));
 const codes=new Set(),ids=new Set();
 const teams=input.teams.map(raw=>{
  if(!raw.id.startsWith('npb-')||codes.has(raw.id))throw new Error('Invalid NPB club '+raw.id);
  codes.add(raw.id);
  if(raw.batters.length!==16||raw.pitchers.length!==14)throw new Error('Invalid 2026 NPB roster '+raw.id);
  const make=(p,type)=>{
   const keys=type==='b'?['contact','power','run','field','arm']:['velocity','control','movement','stamina'];
   if(!required(p,keys))throw new Error('Missing 2026 NPB ability: '+raw.id+'/'+p.name);
   if(!p.sourceUrl||!p.stats||!p.statsLevel)throw new Error('Unattributed NPB stats: '+raw.id+'/'+p.name);
   if(ids.has(p.id))throw new Error('Duplicate NPB player ID '+p.id);
   ids.add(p.id);
   return {...p,teamId:raw.id,club:raw.name,nativeName:p.name,competition:'npb2026',
    positions:p.positions?.length?p.positions:[p.pos],
    lineupDate:raw.lineupDate||'2026',
    ratingsBasedOnStats:true,
    ratingsProvisional:false};
  };
  const batters=raw.batters.map(p=>make(p,'b'));
  const pitchers=raw.pitchers.map(p=>make(p,'p'));
  const selected=new Set(raw.startingOrder);
  if(selected.size!==9||[...selected].some(id=>!batters.some(p=>p.id===id)))
   throw new Error('Invalid NPB starting lineup '+raw.id);
  const startingFielding=Object.fromEntries(raw.startingOrder.map(id=>{
   const p=batters.find(x=>x.id===id);return [p.pos,p.id];
  }));
  return {...raw,batters,pitchers,startingFielding};
 });
 const byId=new Map(teams.map(team=>[team.id,team]));
 const previousGet=NightTeams.get.bind(NightTeams);
 NightTeams.npb=teams;
 NightTeams.npbDataVersion=input.version;
 NightTeams.npbRatingsSource=input.source;
 // Normal CPBL pennant, season archives and career mode remain six-club-only.
 NightTeams.matchTeams=[...cpbl,...teams];
 // Includes 6 CPBL, 4 APBC and 14 NPB for practice and HR derby.
 NightTeams.playable=[...cpbl,...countries,...teams];
 NightTeams.get=id=>byId.get(id)||previousGet(id);
 window.NightNPB={
  season:input.season,version:input.version,
  teams,
  divisions:{central:teams.filter(t=>t.division==='central'),
   pacific:teams.filter(t=>t.division==='pacific'),
   farm:teams.filter(t=>t.farmOnly)},
  get:id=>byId.get(id),
  source:input.source,
  referencePopulations:input.referencePopulations
 };
})();
