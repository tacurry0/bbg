/* 2026 KBO League: 10 clubs / 300 official-results-derived game ratings.
 * Loaded after the six-team CPBL and fourteen-team NPB registration.
 * CPBL pennant, APBC tournament and existing saved competition remain unchanged.
 */
(()=>{
 'use strict';
 const input=window.NightKBOData;
 if(!input||!Array.isArray(input.teams)||input.teams.length!==10||!window.NightTeams)
  throw new Error('2026 KBO source dataset missing or incomplete');
 const ids=new Set(),clubIDs=new Set();
 const clubs=input.teams.map(raw=>{
  if(!raw.id.startsWith('kbo-')||clubIDs.has(raw.id))
   throw new Error('Invalid KBO club id '+raw.id);
  clubIDs.add(raw.id);
  if(raw.batters?.length!==16||raw.pitchers?.length!==14)
   throw new Error('Expected exactly 16 hitters and 14 pitchers for '+raw.id);
  const make=(p,type)=>{
   const keys=type==='b'?['contact','power','run','field','arm']:['velocity','control','movement','stamina'];
   if(!p.id||ids.has(p.id)||keys.some(k=>!Number.isFinite(p[k])))
    throw new Error('Invalid KBO player or ability '+raw.id+': '+p.name);
   if(!p.sourceUrl||!p.identityUrl||!p.stats||!p.statsLevel||!p.ratingsBasedOnStats)
    throw new Error('Unattributed KBO result '+raw.id+': '+p.name);
   ids.add(p.id);
   return {...p,teamId:raw.id,club:raw.name,competition:'kbo2026',
     lineupDate:raw.lineupDate||'2026',positions:p.positions?.length?p.positions:[p.pos]};
  };
  const batters=raw.batters.map(p=>make(p,'b')),pitchers=raw.pitchers.map(p=>make(p,'p'));
  const start=new Set(raw.startingOrder);
  if(start.size!==9||[...start].some(id=>!batters.some(p=>p.id===id)))
   throw new Error('Invalid starting nine for KBO '+raw.id);
  const startingFielding=Object.fromEntries(raw.startingOrder.map(id=>{
   const p=batters.find(player=>player.id===id);return [p.pos,p.id];
  }));
  if(Object.keys(startingFielding).length!==9)
   throw new Error('KBO starting fielders not uniquely assigned '+raw.id);
  return {...raw,batters,pitchers,startingFielding};
 });
 const oldGet=NightTeams.get.bind(NightTeams);
 const clubsById=new Map(clubs.map(c=>[c.id,c]));
 NightTeams.kbo=clubs;
 NightTeams.kboDataVersion=input.version;
 NightTeams.matchTeams=[...(NightTeams.matchTeams||NightTeams.all),...clubs];
 NightTeams.playable=[...(NightTeams.playable||NightTeams.all),...clubs];
 NightTeams.get=id=>clubsById.get(id)||oldGet(id);
 window.NightKBO={
  season:input.season,version:input.version,teams:clubs,source:input.source,
  referencePopulations:input.referencePopulations,get:id=>clubsById.get(id)
 };
})();
