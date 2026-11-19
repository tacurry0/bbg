/* Country-specific school events, brackets, and amateur draft routes. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,L=NightCareerWorldLeagues;
 const {date,stamp,phases,countries}=D;
 function calendar(world){
  const {country,grade,academicYear:year}=world;
  if(world.stage==='amateur'){
   const provider=world.path;
   const start=date(world.amateurStart,countries[country].start);
   return [{day:stamp(start,30),name:provider+' リーグ戦',format:0,index:0},
    {day:stamp(start,58),name:provider+' 招待大会',format:0,index:1},
    {day:stamp(start,75),name:provider+' スカウト視察',format:0,index:2},
    {day:date(world.amateurStart+(country==='tw'?1:0),countries[country].draft),name:'ドラフト参加手続き',format:4,index:99}];
  }
  const yearStart=date(year,countries[country].start);
  const entries=phases[country].flatMap(([name,md,format,requirement,years=3],index)=>{
   if(grade>years)return [];
   const day=date(date(year,md)<yearStart?year+1:year,md);
   return {day,name,format,index,requirement};
  });
  const decision=grade===3?date(year+(country==='tw'?1:0),countries[country].draft):date(year+1,countries[country].start);
  entries.push({day:decision,name:grade===3?'ドラフト参加手続き':'進級',format:grade===3?4:5,index:99});
  return entries.sort((a,b)=>a.day.localeCompare(b.day));
 }
 function eligible(w,tag){
  if(!tag)return true;
  if(tag==='wood')return w.schoolTier!==0;
  if(tag==='aluminum')return w.schoolTier===0;
  if(tag==='selected')return w.regionalSelected;
  const [mode,n]=tag.split(':'),old=w.schoolEvents[n];
  return mode==='win'?old?.place===1:old?.place<=2;
 }
 function teams(w,e){
  const regional=e.requirement==='selected';
  const league=e.format===2;
  const count=league?4:8;
  const home=regional?'region-player':w.player.club;
  const rng=w.random('school/'+e.index);
  const local=w.country==='jp'&&[0,3,5].includes(e.index);
  const district=(w.country==='jp'&&[1,6].includes(e.index))||(w.country==='kr'&&[2,4].includes(e.index));
  const all=countries[w.country].region.filter(r=>r!==w.region);
  const candidates=w.stage==='amateur'?all:local?[w.region]:district?D.district(w.country,w.region):all;
  const opponents=Array.from({length:count-1},(_,i)=>{
   const region=candidates[(e.index+i)%candidates.length];
   const id=(regional?'region-':w.stage==='amateur'?'amateur-':'school-')+region+(regional?'':'-'+(e.index%3)+'-'+i);
   const label=regional?region+'代表':w.stage==='amateur'?region+'アマ選抜':region+' '+D.schools[w.country][i%D.schools[w.country].length];
   const tier=rng()<.25?2:rng()<.55?1:0;
   w.ensureSchoolClub(id,label,tier,region);
   return id;
  });
  return [home,...opponents];
 }
 function open(w,e){
  if(e.format===3){
   const score=w.ability(w.player)+w.schoolScout()+w.grade*5;
   w.regionalSelected=score>=75||w.random('regional/'+w.grade)()<.13;
   w.note(w.regionalSelected?w.region+'の玉山盃代表に選出':w.region+'の玉山盃代表選考で落選');
   w.schoolEvents[e.index]={place:w.regionalSelected?1:9};
   return;
  }
  if(e.format===4){w.stage='draft';w.draft={application:false,picks:[],visible:0,offer:null};w.note(e.name);return;}
  if(e.format===5){w.nextGrade();return;}
  if(!eligible(w,e.requirement)){
   w.schoolEvents[e.index]={place:null,name:e.name};return;
  }
  const clubs=teams(w,e);
  const own=clubs[0];
  const draw=e.format===2?D.roundRobin(clubs):[e.format===1?clubs.map((_,i)=>i%2===0?[clubs[i],clubs[i+1]]:null).filter(Boolean):[[own,clubs[1]]]];
  w.tournament={event:e,own,clubs,round:0,draw,results:[],finished:false,
   table:Object.fromEntries(clubs.map(id=>[id,{all:{w:0,l:0,t:0,rf:0,ra:0},first:{w:0,l:0,t:0,rf:0,ra:0}}]))};
  w.note(e.name+'が開幕');
 }
 function fixtures(w,t){
  if(!t||t.finished)return [];
  return t.draw[t.round].map(([home,away],i)=>({id:`school/${w.stage==='amateur'?w.amateurStart:w.academicYear}/${w.grade}/${t.event.index}/${t.round}/${i}`,country:w.country,
   home,away,half:'first',day:w.day,kind:'school',name:t.event.name,important:t.event.format===1&&t.round===2,
   park:w.country==='jp'&&/甲子園|選抜/.test(t.event.name)?D.park('jp'):NightPlayers.schoolPark(t.round,w.schoolIndex,t.event.format===0)}));
 }
 function completeRound(w,events){
  const t=w.tournament;
  const winners=events.map(([f,r])=>r.home>r.away?f.home:f.away);
  for(const [f,r] of events){
   L.record(t.table,f,r);
   t.results.push({round:t.round,homeId:f.home,awayId:f.away,...r});
  }
  const knockout=t.event.format===1;
  if(knockout&&winners.length>1){
   t.draw.push(winners.flatMap((x,i)=>i%2===0?[[x,winners[i+1]]]:[]));
   t.round++;
   return;
  }
  if(!knockout&&t.round+1<t.draw.length){t.round++;return;}
  t.finished=true;
  const table=L.standings(t.table,t.clubs);
  const place=knockout?t.results.filter(g=>[g.homeId,g.awayId].includes(t.own))
   .reduce((p,g)=>((g.home>g.away?g.homeId:g.awayId)===t.own?Math.max(1,p/2):p),8):table.findIndex(r=>r.id===t.own)+1;
  const winner=knockout?winners[0]:table[0].id;
  w.schoolEvents[t.event.index]={place,name:t.event.name,winner,results:t.results.slice(),scout:w.scoutLevel};
  w.schoolHistory.push({year:w.academicYear,grade:w.grade,name:t.event.name,place,winner:w.clubName(winner)});
  if(winner===t.own&&t.event.format!==0)w.note(t.event.name+'で優勝');
  if(w.stage==='amateur')w.academyGames++;
 }
 function selectDraft(w){
  const country=w.country;
  const rank=w.pastRanking(country).reverse();
  const teams=D.roster(country).slice().sort((a,b)=>(rank.indexOf(a.id)+rank.length)%Math.max(1,rank.length)-(rank.indexOf(b.id)+rank.length)%Math.max(1,rank.length));
  const rng=w.random('draft/'+w.day),scout=w.schoolScout();
  const rounds=country==='kr'?11:country==='jp'?7:6;
  const qualified=w.draft.application&&w.age>=17;
  const grade=w.ability(w.player)*.61+scout*.51+(w.path?6:0)+rng()*13;
  const round=qualified&&grade>(w.difficulty==='easy'?37:w.difficulty==='hard'?46:42)?Math.max(1,Math.min(rounds,Math.ceil((85-grade)/8))):null;
  let drafted=null;
  const byNeed=teams.slice().sort((a,b)=>w.depth(a.id,w.player.pos)-w.depth(b.id,w.player.pos));
  const bids=country==='jp'&&round===1?byNeed.slice(0,grade>81?3:grade>73?2:1).map(c=>c.id):[];
  const chosen=round?(bids.length?bids[Math.floor(rng()*bids.length)]:byNeed[Math.floor(rng()*Math.min(4,byNeed.length))].id):null;
  const pool=w.people.filter(p=>p.school&&p.id!==w.player.id&&p.stage==='school'&&w.year-p.born>=17)
   .sort((a,b)=>w.ability(b)-w.ability(a));
  const order=[];
  for(let r=1;r<=rounds;r++){
   const sequence=country==='jp'&&r>2&&r%2===1?teams.slice().reverse():teams;
   for(const club of sequence){
    if(r===round&&chosen===club.id){
     drafted={club:club.id,round:r,name:w.player.name,id:w.player.id,sequence:order.length+1,bids};
     order.push(drafted);
    }else{
     const prospect=pool.shift();
     order.push({club:club.id,round:r,name:prospect?.name||D.name(country,rng),id:prospect?.id||null,sequence:order.length+1});
    }
   }
  }
  w.draft.picks=order;
  w.draft.offer=drafted;
  w.draft.visible=0;
 }
 window.NightCareerWorldSchool={calendar,open,fixtures,completeRound,selectDraft};
})();
