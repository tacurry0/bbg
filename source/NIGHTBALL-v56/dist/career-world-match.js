/* Shared lineup selection and deterministic background games. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,L=NightCareerWorldLeagues;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const batting=['contact','power','run','field','arm'],pitching=['velocity','control','movement','stamina'];
 const roleText={starter:'スタメン',pinch:'代打',runner:'代走',defense:'守備固め',rotation:'先発',setup:'中継ぎ',closer:'抑え',farm:'二軍',inactive:'ベンチ外',bench:'一軍ベンチ'};
 const blank=()=>({g:0,pa:0,ab:0,h:0,hr:0,tb:0,r:0,rbi:0,bb:0,k:0,sb:0,outs:0,er:0,w:0,rw:0,sv:0,hd:0,walks:0,errors:0});
 const merge=(dst,src)=>{for(const key of Object.keys(dst))dst[key]+=Number(src[key])||0;return dst;};
 const rate=(n,d)=>d?n/d:0;
 const ops=s=>rate(s.h+s.bb,s.pa)+rate(s.tb,s.ab);
 const era=s=>s.outs?27*s.er/s.outs:99;
 function farmForm(w){
  const stats={...blank(),...w.farmStats};
  const recent=(w.recentFarm||[]).reduce(merge,blank());
  if(w.pitching){
   if(stats.outs<9)return 0;
   const quality=s=>(4.5-era(s))*4+(rate(s.k*27,s.outs)-7)*.85-(rate(s.walks*27,s.outs)-3.4)*1.5;
   const overall=quality(stats),now=recent.outs>=6?quality(recent):overall;
   return clamp(overall*.56+now*.44,-12,30)*Math.min(1,stats.outs/30);
  }
  if(stats.pa<8)return 0;
  const quality=s=>(rate(s.h,s.ab)-.255)*62+(rate(s.h+s.bb,s.pa)-.32)*53+
   (rate(s.hr,s.pa)-.035)*90+(rate(s.rbi,s.pa)-.11)*23;
  const overall=quality(stats),now=recent.pa>=8?quality(recent):overall;
  return clamp(overall*.54+now*.46,-11,31)*Math.min(1,stats.pa/27);
 }
 function positionScore(w,p,pos,league){
  const age=w.year-p.born;
  const s=p.stats;
  const base=w.ability(p)+(p.nation in D.countries?D.countries[p.origin||league].level-D.countries[league].level:0);
  const fluency=p.club===w.club&&p.id===w.player.id?w.adaptation:0;
  const form=p.form||0,penalty=p.injury>0?40:0;
  const formScore=p.pos==='P'?s.outs>=12?clamp((4.6-era(s))*5,-17,18)*Math.min(1,s.outs/42):0:
   s.pa>=8?clamp((ops(s)-.68)*48,-19,19)*Math.min(1,s.pa/36):0;
  const glove=p.pos==='P'?0:p.pos===pos?7:p.positions.includes(pos)?3:pos==='DH'?-1:-16;
  const schoolOpportunity=w.stage==='school'?[12,5,0][w.schoolTier]:w.stage==='amateur'?5:0;
  const trust=p.id===w.player.id?(w.ratings.manager-50)*.12+schoolOpportunity+({easy:8,normal:0,hard:-5})[w.difficulty]:0;
  const firstTeamSample=p.pos==='P'?s.outs/45:s.pa/44;
  const promotion=p.id===w.player.id&&w.stage==='pro'?farmForm(w)*(1-Math.min(.88,firstTeamSample))+
   (w.ratings.coach-50)*.1:0;
  return base+formScore+glove+form+trust+promotion-fluency-penalty-(age>38?2:0);
 }
 function lineup(w,id,country,day,{farm=false,withoutPlayer=false,development=false}={}){
  const roster=w.members(id).filter(p=>p.id!==w.player.id||(!withoutPlayer&&w.health.injury===0));
  const hittersAvailable=roster.filter(p=>p.pos!=='P'&&!p.injury).length;
  const pitchersAvailable=roster.filter(p=>p.pos==='P'&&!p.injury).length;
  const members=roster.filter(p=>!p.injury||(p.pos==='P'?pitchersAvailable<3:hittersAvailable<9));
  const byPosition=(a,b,pos)=>positionScore(w,b,pos,country)-positionScore(w,a,pos,country)||a.id.localeCompare(b.id);
  const hitters=members.filter(p=>p.pos!=='P').sort((a,b)=>byPosition(a,b,'DH'));
  const pitchers=members.filter(p=>p.pos==='P').sort((a,b)=>byPosition(a,b,'P'));
  const starters=[],assign={};
  for(const pos of D.positions){
   const candidates=hitters.filter(p=>!starters.includes(p)).sort((a,b)=>byPosition(a,b,pos));
   const starter=pos===w.player.pos&&farm&&candidates.includes(w.player)?w.player:candidates[0];
   if(starter){starters.push(starter);assign[pos]=starter.id;}
  }
  const dayNumber=+day.slice(8);
  const startersPitch=pitchers.filter(p=>p.role==='SP');
  const own=members.includes(w.player),pitching=w.player.pos==='P';
  const rotation=(startersPitch.length>=3?startersPitch:pitchers).slice(0,5);
  const rotationPitcher=rotation[dayNumber%rotation.length];
  const starter=farm&&own&&pitching?w.player:rotationPitcher;
  const reserves=hitters.filter(p=>!starters.includes(p));
  const relief=pitchers.filter(p=>p!==starter);
  const closers=relief.filter(p=>p.role==='CP');
  const closer=closers[0]||relief.find(p=>p.role==='RP')||relief[0];
  const middle=relief.find(p=>p!==closer&&p.role!=='SP')||relief.find(p=>p!==closer);
  let usage='inactive';
  if(own){
   if(pitching){
    if(starter===w.player)usage='rotation';
    else if(closer===w.player)usage='closer';
    else if(middle===w.player||relief.indexOf(w.player)<4&&dayNumber%3===0)usage='setup';
    else if(rotation.includes(w.player))usage='bench';
   }else if(starters.includes(w.player))usage='starter';
   else if(reserves.indexOf(w.player)<3){
    usage=dayNumber%4===0?'runner':dayNumber%4===2?'defense':'pinch';
   }
  }
  if(own&&development&&['inactive','bench'].includes(usage))usage=pitching?'setup':'pinch';
  const bench=own&&!pitching&&usage!=='inactive'&&usage!=='starter'?w.player:reserves[0];
  // Rotate the bottom third across the season so position battles also depend on live form.
  const order=starters.slice().sort((a,b)=>b.contact+b.run*.22-a.contact-a.run*.22);
  return {id,assign,order,hitters,pitchers,starter,middle,closer,bench,usage};
 }
 function playerFor(w,p,country){
  const keys=p.pos==='P'?pitching:batting;
  const quality=(D.countries[p.origin||country].level-D.countries[country].level)*.7+(p.form||0)*.5;
  const player=p.id===w.player.id;
  const partner=player?w.members(p.club||'school-player').find(q=>q.id!==p.id&&q.relationship>=65&&
   (p.pos==='P'&&q.pos==='C'||p.pos==='SS'&&q.pos==='2B'||p.pos==='2B'&&q.pos==='SS')):null;
  const pressure=player?w.health.fatigue*.05+w.health.slump*2+w.adaptation-(partner?2:0):0;
  const calibrated=Object.fromEntries(keys.map(k=>[k,clamp(p[k]+quality-pressure,k==='velocity'?111:18,k==='velocity'?166:99)]));
  return {...p,...calibrated,careerPerks:player?Object.fromEntries(w.perks.map(key=>[key,1])):{},careerForm:player?w.ratings.coach:50};
 }
 function team(w,l,country){
  const c=NightTeams.get(l.id),known=c.id===l.id;
  const base=known?c:{id:l.id,name:w.clubName(l.id),short:w.clubName(l.id),mark:w.clubName(l.id).slice(0,3),color:'#1768b1',accent:'#eef7ff'};
  const pitchers=[l.starter,...l.pitchers.filter(p=>p!==l.starter)].filter(Boolean);
  return {...base,park:base.park||D.park(country),batters:l.hitters.map(p=>playerFor(w,p,country)),
   pitchers:pitchers.map(p=>playerFor(w,p,country)),startingOrder:l.order.map(p=>p.id),startingFielding:l.assign};
 }
 function simulate(w,f,opts){
  const country=id=>w.clubCountry(id)||f.country;
  const fHome=lineup(w,f.home,country(f.home),f.day,opts),fAway=lineup(w,f.away,country(f.away),f.day,opts);
  const home=team(w,fHome,country(f.home)),away=team(w,fAway,country(f.away));
  const stats={},scores={home:0,away:0},counts={home:0,away:0};
  const played=new Set();
  const rng=w.random(f.id),lastPitcher={},leadPitcher={},limit=L.inningLimit(f);
  const stat=id=>stats[id] ||= blank();
  const mark=id=>{played.add(id);return stat(id);};
  const line=(side,opponent,l,pitchPlan,inn)=>{
   let outs=0,bases=[null,null,null];
   const battingOrder=side.startingOrder;
   const hitting=side.id===f.home?'home':'away',fielding=hitting==='home'?'away':'home';
   const score=scores[hitting],lead=scores[fielding]-score;
   const arm=inn>=9&&lead>0&&lead<=3?pitchPlan.closer:inn>=7?pitchPlan.middle:pitchPlan.starter;
   const p=opponent.pitchers.find(x=>x.id===arm?.id)||opponent.pitchers[0];
   const q=mark(p.id);
   lastPitcher[fielding]=p.id;
   const late=inn>=7&&l.bench&&['pinch','runner','defense'].includes(l.usage);
   if(late&&l.usage==='defense')mark(l.bench.id);
   while(outs<3){
    const slot=counts[hitting]++%9;
    const id=late&&l.usage==='pinch'&&slot===7?l.bench.id:battingOrder[slot];
    const b=side.batters.find(x=>x.id===id);
    const s=mark(b.id);
    s.pa++;
    const u=rng(),bb=clamp(.08+(67-p.control)*.001,.035,.14);
    const hit=clamp(.235+(b.contact-64)*.003-(p.control+p.movement-128)*.001,.095,.37);
    const hr=clamp(.025+(b.power-63)*.0012-(p.velocity-144)*.0012,.006,.086);
    if(u>=bb+hit){
     s.ab++;outs++;q.outs++;
     if(rng()<clamp(.26+(p.movement-68)*.006-(b.contact-64)*.003,.11,.52)){s.k++;q.k++;}
     continue;
    }
    let advance;
    if(u<bb){s.bb++;q.walks++;if(bases[0]&&bases[1]&&bases[2]){stat(bases[2]).r++;scores[hitting]++;s.rbi++;q.er++;}
     if(bases[0]&&bases[1])bases[2]=bases[1];
     if(bases[0])bases[1]=bases[0];
     bases[0]=id;
    }else{
     advance=u<bb+hr?4:rng()<.22?2:rng()<.05?3:1;
     s.ab++;s.h++;s.tb+=advance;
     for(let i=2;i>=0;i--)if(bases[i]){
      const runner=bases[i];bases[i]=null;
      if(i+advance>=3){stat(runner).r++;scores[hitting]++;s.rbi++;q.er++;}
      else bases[i+advance]=runner;
     }
     if(advance===4){s.hr++;s.r++;s.rbi++;scores[hitting]++;q.er++;}
     else bases[advance-1]=id;
    }
    if(late&&l.usage==='runner'&&bases[0]&&bases[0]!==l.bench.id){bases[0]=l.bench.id;mark(l.bench.id);l.usage='bench';}
    if(bases[0]&&!bases[1]&&rng()<.045){
     const runner=side.batters.find(x=>x.id===bases[0]);
     if(rng()<clamp(.63+(runner.run-60)*.007,.40,.86)){stat(runner.id).sb++;bases[1]=bases[0];}
     else {outs++;q.outs++;}
     bases[0]=null;
    }
    if(hitting==='home'&&inn>=9&&(scores.home>scores.away||f.drawClinches&&inn===limit&&scores.home===scores.away))break;
   }
   if(score<=scores[fielding]&&scores[hitting]>scores[fielding])leadPitcher[hitting]=lastPitcher[hitting]||(hitting==='home'?fHome:fAway).starter.id;
   if(inningsWinner(inn,hitting,scores)&&lead>0&&lead<=3&&arm===pitchPlan.closer&&q.outs>=3)q.sv++;
   if(inn===7&&lead>0&&lead<=3&&scores[fielding]>scores[hitting]&&arm===pitchPlan.middle&&q.outs>=3)q.hd++;
  };
  let inning=0;
  do{
   inning++;
   line(away,home,fAway,fHome,inning);
   if(inning<9||scores.home<scores.away||scores.home===scores.away&&!(f.drawClinches&&inning===limit))line(home,away,fHome,fAway,inning);
  }while(inning<9||scores.home===scores.away&&(!limit||inning<limit));
  for(const id of played)stats[id].g=1;
  if(scores.home!==scores.away){
   const side=scores.home>scores.away?'home':'away',start=(side==='home'?fHome:fAway).starter.id;
   const fallback=(side==='home'?fHome:fAway).pitchers.find(q=>q.id!==start&&stats[q.id]?.outs)?.id;
   const decision=leadPitcher[side]===start&&stat(start).outs<15?fallback||start:leadPitcher[side]||start;
   stat(decision).w++;
   if(decision!==start)stat(decision).rw++;
   const last=lastPitcher[side],plan=side==='home'?fHome:fAway;
   if(last===plan.closer?.id&&last!==decision&&Math.abs(scores.home-scores.away)<=3&&stat(last).outs>=3)stat(last).sv=Math.max(1,stat(last).sv);
  }
  return {...scores,stats,inning};
 }
 const inningsWinner=(inning,hitting,score)=>inning>=9&&hitting==='away'&&score.home>score.away;
 window.NightCareerWorldMatch={clamp,batting,pitching,roleText,blank,merge,rate,ops,era,farmForm,positionScore,lineup,team,playerFor,simulate};
})();
