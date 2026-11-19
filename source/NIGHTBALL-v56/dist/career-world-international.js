/* International formats. Future dates and groups are in-game projections. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,L=NightCareerWorldLeagues;
 const team=id=>'national-'+id;
 const names={jp:'日本',tw:'チャイニーズ・タイペイ',kr:'韓国',au:'オーストラリア',us:'アメリカ',mx:'メキシコ',
  ca:'カナダ',pr:'プエルトリコ',ve:'ベネズエラ',do:'ドミニカ共和国',cu:'キューバ',pa:'パナマ',co:'コロンビア',
  ni:'ニカラグア',it:'イタリア',nl:'オランダ',cz:'チェコ',gb:'イギリス',il:'イスラエル',br:'ブラジル',es:'スペイン'};
 const cups={
  WBC:{groups:[['pr','cu','ca','pa','co'],['us','mx','it','gb','br'],['jp','tw','kr','au','cz'],['ve','do','nl','il','ni']],start:'03-06',type:'wbc'},
  'プレミア12':{groups:[['tw','au','nl','es'],['jp','cu','it','ca'],['kr','do','pa','cz'],['us','mx','ve','pr']],start:'11-08',type:'premier'},
  APBC:{groups:[['jp','tw','kr','au']],start:'11-13',type:'apbc'}
 };
 const labels={pool:'予選',second:'2次ラウンド',super:'スーパーラウンド',quarter:'準々決勝',semi:'準決勝',medals:'決勝・3位決定戦'};
 const groupsTable=groups=>Object.fromEntries(groups.flat().map(id=>[id,{all:{w:0,l:0,t:0,rf:0,ra:0},first:{w:0,l:0,t:0,rf:0,ra:0}}]));
 const groupDays=groups=>{
  const schedules=groups.map(D.roundRobin);
  return Array.from({length:Math.max(...schedules.map(x=>x.length))},(_,i)=>schedules.flatMap(x=>x[i]||[]));
 };
 function stage(n,key,groups,fixtures=groupDays(groups)){
  n.round={key,groups,fixtures,tables:groupsTable(groups),dayIndex:0,results:[]};
 }
 function create(cup,year){
  const config=cups[cup],groups=config.groups.map(row=>row.map(team));
  const n={cup,year,format:config.type,rosters:{},guests:[],history:[],champion:null,third:null,done:false,
   actualSchedule:cup==='プレミア12'&&year===2027,next:D.date(year,config.start)};
  stage(n,'pool',groups);
  return n;
 }
 function fixtures(w,n){
  if(n.done||w.day<n.next)return [];
  const {key,dayIndex,fixtures}=n.round;
  return fixtures[dayIndex].map(([home,away],i)=>({
   id:`${n.year}/national/${n.cup}/${key}/${dayIndex+1}/${i+1}`,kind:'national',day:w.day,country:w.country,
   home,away,half:'first',name:n.cup+' '+(key==='medals'?(i===0?'決勝':'3位決定戦'):labels[key]),important:true,
   internationalFinal:key==='medals'&&i===0,park:D.park(key==='medals'||n.format==='apbc'?'jp':n.format==='premier'?'tw':w.country)
  }));
 }
 const rank=(table,groups)=>groups.map(ids=>L.standings(table,ids).map(r=>r.id));
 const winner=g=>g.home>g.away?g.homeId:g.awayId;
 function next(n){
  const r=n.round,finish=r.results;
  const rows=rank(r.tables,r.groups);
  n.history.push({key:r.key,groups:r.groups,rank:rows,results:finish});
  if(r.key==='medals'){
   n.champion=winner(finish[0]);n.third=finish[1]?winner(finish[1]):null;n.done=true;
  }else if(r.key==='pool'&&n.format==='wbc'){
   const [a,b,c,d]=rows;
   stage(n,'quarter',[],[[[a[0],b[1]],[b[0],a[1]],[c[0],d[1]],[d[0],c[1]]]]);
  }else if(r.key==='quarter'){
   const q=finish.map(winner);
   stage(n,'semi',[],[[[q[0],q[2]],[q[1],q[3]]]]);
  }else if(r.key==='semi'){
   stage(n,'medals',[],[[finish.map(winner)]]);
  }else if(r.key==='pool'&&n.format==='premier'){
   const q=rows.map(x=>x.slice(0,2));
   stage(n,'second',[q[0].concat(q[1]),q[2].concat(q[3])]);
  }else if(r.key==='second'){
   stage(n,'super',[rows.flatMap(r=>r.slice(0,2))]);
  }else{
   const order=rows[0];
   stage(n,'medals',[],[[order.slice(0,2),order.slice(2,4)]]);
  }
 }
 function complete(n,day,events){
  for(const [f,s] of events){
   n.round.results.push({id:f.id,homeId:f.home,awayId:f.away,home:s.home,away:s.away,inning:s.inning});
   if(n.round.groups.length)L.record(n.round.tables,f,s);
  }
  n.round.dayIndex++;
  if(n.round.dayIndex===n.round.fixtures.length)next(n);
  n.next=D.stamp(day,1);
 }
 const firstNames={en:['Oliver','Daniel','Caleb','Dylan','Colin','Cameron'],es:['Luis','José','Manuel','Jorge','Diego','Marco'],
  it:['Marco','Luca','Davide','Simone','Andrea','Fabio'],nl:['Lars','Bram','Daan','Jesse','Ruben','Timo'],
  cz:['Petr','Jan','Marek','Adam','Lukáš','Tomáš'],il:['Noam','Itai','Ori','Amit','Omer','Eitan'],br:['Lucas','Rafael','Paulo','Bruno','João','Tiago']};
 const lastNames={en:['Blake','Collins','Reed','Fletcher','Moreau','Taylor'],es:['Campos','Delgado','Rivas','Castillo','Rojas','Núñez'],
  it:['Marini','Moretti','Gallo','Vitale','Serra','Monti'],nl:['de Vries','van Dijk','de Boer','Jansen','Visser','Bakker'],
  cz:['Novák','Dvořák','Svoboda','Černý','Král','Kučera'],il:['Levi','Cohen','Shalev','Barak','Tal','Katz'],br:['Costa','Alves','Lima','Souza','Moura','Ribeiro']};
 function guestRoster(w,n,id){
  const nation=id.slice(9),locale=['us','gb','au','ca'].includes(nation)?'en':firstNames[nation]?nation:'es';
  const rng=w.random(id+'/'+n.cup+'/'+n.year);
  const positions=[...D.positions,'C','SS','CF','1B','RF',...Array(14).fill('P')];
  return positions.map((pos,i)=>{
   const pid=id+'/'+n.cup+'/'+n.year+'/'+i;
   const p=w.npc(w.country,pid,3,pos,rng,n.format==='apbc'?21:28,null);
   p.name=firstNames[locale][i%6]+' '+lastNames[locale][Math.floor(i/6)];
   p.nation=nation;p.origin=w.country;
   n.guests.push(p);
   return pid;
  });
 }
 window.NightCareerWorldInternational={create,fixtures,complete,guestRoster,labels,names};
})();
