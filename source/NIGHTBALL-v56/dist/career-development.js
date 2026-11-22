/* Scouting, evaluation, training and simulated appearances share one set of stats. */
(()=>{
 'use strict';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const clampGrade=n=>clamp(Math.round(n),0,100);
 const BAT_DRILLS={
  contact:{label:'ミート練習',skill:'contact',support:'field'},
  power:{label:'長打練習',skill:'power',support:'arm'},
  run:{label:'走塁練習',skill:'run',support:'contact'},
  field:{label:'守備練習',skill:'field',support:'arm'},
  arm:{label:'送球練習',skill:'arm',support:'field'},
  left:{label:'対左投手対策',special:true},
  position:{label:'第二守備位置を練習',special:true}
 };
 const PITCH_DRILLS={
  velocity:{label:'球速トレーニング',skill:'velocity',support:'stamina'},
  control:{label:'制球練習',skill:'control',support:'movement'},
  movement:{label:'変化球練習',skill:'movement',support:'control'},
  stamina:{label:'先発向けの体力練習',skill:'stamina',support:'control'},
  pitch:{label:'新球種を練習',special:true},
  relief:{label:'救援向けの準備',skill:'control',support:'movement'}
 };
 const battingNeeds=['出塁力','長打力','守備力','走力','出塁力','長打力'];
 const pitchingNeeds=['先発候補','制球力','奪三振力','救援候補','制球力','先発候補'];
 const goals={
  出塁力:'出塁率とミート',長打力:'長打率とパワー',守備力:'守備機会と守備力',走力:'走力と出塁率',
  先発候補:'投球回と持久力',制球力:'与四球の少なさと制球',奪三振力:'奪三振と球威',救援候補:'失点の少なさと変化球'
 };
 class CareerDevelopment{
  static blank(){return {games:0,pa:0,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,tb:0,outs:0,allowed:0,earned:0,walks:0,fieldChances:0,fieldOuts:0,errors:0,saves:0};}
  static obp(s){return (s.h+s.bb)/Math.max(1,s.ab+s.bb);}
  static slugging(s){return s.tb/Math.max(1,s.ab);}
  static max(key){return key==='velocity'?162:99;}
  static drills(pitching){return pitching?PITCH_DRILLS:BAT_DRILLS;}
  static grade(rating){
   return rating>=70?'好調':rating>=50?'まずまず':rating>=30?'あと一歩':'苦戦';
  }
  static evaluate(s,pitching){
   const reasons=[];
   const note=(good,text)=>reasons.push({good,text});
   const games=Math.max(1,s.games);
   let rating;
   if(pitching){
    const ip=Math.max(1,s.outs/3);
    rating=38+Math.min(24,s.k/ip*16)+Math.min(10,s.outs/games*1.5)
     +(s.allowed===0?17:-s.allowed/ip*21)+(s.walks===0?8:-s.walks/ip*9);
    note(s.allowed===0,s.allowed?s.allowed+'失点で評価が下がりました':'失点を許しませんでした');
    if(s.k)note(true,s.k+'奪三振で評価アップ');
    if(s.walks)note(false,'与四球 '+s.walks+'。ストライク先行を狙いましょう');
   }else{
    const pa=Math.max(1,s.pa);
    rating=19+Math.min(48,(s.h+s.bb*.65)/pa*99)+Math.min(28,s.tb/pa*47+s.rbi/games*3)
     -Math.min(5,s.k/pa*5);
    if(s.h)note(true,s.h+'安打'+(s.hr?'（本塁打 '+s.hr+'）':'')+'で評価アップ');
    if(s.bb)note(true,'四球で'+s.bb+'回出塁');
    if(s.rbi)note(true,s.rbi+'打点を記録');
    if(!s.h&&!s.bb)note(false,'出塁できませんでした。安打と四球が評価につながります');
    if(s.k)note(false,s.k+'三振');
   }
   const score=clampGrade(rating);
   return {rating:score,reasons,grade:this.grade(score)};
  }
  static simulateFielding(c,f,s){
   if(!f.fielding||s.fieldChances)return;
   const rng=NightCareerLeagues.random(c.seed+'/'+f.id+'/defense');
   if(rng()<.25)return;
   const player=c.player();
   s.fieldChances=1;
   s.fieldOuts=rng()<.58+player.field*.004+player.arm*.001?1:0;
   s.errors=1-s.fieldOuts;
  }
  static scout(c){
   const s=c.schoolStats,p=c.skills,pa=Math.max(1,s.pa),ip=Math.max(1,s.outs/3),rating=c.evaluation??0;
   const merits=c.pitching?[
    (p.stamina-62)*.32+s.outs/Math.max(1,s.games)*1.8,
    (p.control-64)*.4+8-8*s.walks/ip,
    (p.movement-63)*.38+10*s.k/ip,
    (p.movement-60)*.28+11-9*s.allowed/ip
   ]:[
    (p.contact-60)*.48+this.obp(s)*16,
    (p.power-56)*.42+this.slugging(s)*11,
    (p.field-55)*.42+(s.fieldOuts-s.errors)*10/Math.max(1,s.fieldChances),
    (p.run-56)*.48+(s.h+s.bb)*13/pa
   ];
   const needs=c.pitching?pitchingNeeds:battingNeeds;
   const lookup=c.pitching?['先発候補','制球力','奪三振力','救援候補']:['出塁力','長打力','守備力','走力'];
   return NightTeams.all.map((club,i)=>{
    const need=needs[i],score=clampGrade(rating*.86+merits[lookup.indexOf(need)]+c.schoolTitles*2+c.scoutExposure+(i%3)*2+(c.extras?.base?.scoutBoost?.[club.id]||0));
    return {clubId:club.id,need,score,detail:goals[need]};
   }).sort((a,b)=>b.score-a.score);
  }
  static addExperience(c,s,manual){
   const pending=c.drills[c.plan],gains={};
   const pitchExp={
    velocity:s.k*4,movement:s.k*7,control:Math.max(0,s.outs*3-s.walks*5),stamina:s.outs*4
   },batExp={
    contact:s.h*8+s.bb*4,power:Math.max(0,s.tb-s.h)*8+s.hr*4,
    run:s.h*3+s.bb*3,field:s.fieldOuts*10,arm:s.fieldOuts*7
   };
   const exp=c.twoWay?{...pitchExp,...batExp}:c.pitching?pitchExp:batExp;
   for(const key of Object.keys(exp)){
    const practice=pending?.skill===key?24:pending?.support===key?10:0;
    const amount=Math.round((5+exp[key]+practice)*(manual?1:.65)*(c.fatigue>=75?.75:1));
    const max=this.max(key),cost=c.xpCost(key);
    const total=(c.xp[key]||0)+amount;
    c.xp[key]=Math.min(cost-1,total);
    if(c.skills[key]<max&&total>=cost){c.skills[key]++;gains[key]=1;c.xp[key]=total-cost;}
   }
   if(pending?.special&&c.goal){
    c.goal.progress+=manual?1.2:.7;
    if(c.goal.progress>=3){
     const {target}=c.goal;
     if(c.plan==='pitch')c.pitches.push(target);
     if(c.plan==='position')c.positions.push(target);
     if(c.plan==='left')c.leftTraining=Math.min(3,c.leftTraining+1);
     gains.special=c.goal.label;
     delete c.specialProgress[c.plan+'|'+target];
     c.goal=null;c.plan=c.pitching?'control':'contact';
    }
   }
   return gains;
  }
  static situation(f,i,key){
   const rng=NightCareerLeagues.random(key+'/'+f.id+'/situation/'+i);
   const end=7+Math.floor(NightCareerLeagues.random(key+'/'+f.id+'/late-inning')()*3);
   const inning=f.pitching?(f.startInning||1)+i:
    f.role==='pinch'||f.role==='defense'?6+i+Math.floor(NightCareerLeagues.random(key+'/'+f.id+'/pinch-entry')()*2):
    f.opportunities===1?end:1+Math.round(i*(end-1)/(f.opportunities-1));
   const outs=Math.floor(rng()*3),bases=rng()<.45?0:Math.floor(rng()*4);
   const scoringRate=i===0&&inning===1?0:i===0?Math.min(3,inning/3):.85;
   const team=f.school?f.schoolProfile:null;
   const own=Math.floor(rng()*(scoringRate+1));
   const opp=Math.floor(rng()*(scoringRate+1));
   const hasPlayed=inning>1;
   return {inning,outs,bases,home:Math.max(0,own+(hasPlayed&&rng()<Math.abs((team?.attack||0)+(f.teamTraining||0))*.34?Math.sign((team?.attack||0)+(f.teamTraining||0)):0)),
    away:Math.max(0,opp-(hasPlayed&&rng()<Math.abs(team?.defense||0)*.32?Math.sign(team.defense):0))};
  }
  static simulate(c,f){
   const rng=NightCareerLeagues.random(c.seed+'/'+f.id+'/player');
   const p=c.player(),s=this.blank();
   s.games=1;
   if(c.pitching){
    const outs=f.opportunities*3-(f.fireman?2:0);
    for(let i=0;s.outs<outs&&i<70;i++){
     const x=rng(),k=clamp(.18+(p.movement-62)*.004+(p.velocity-139)*.002,.04,.5),walk=clamp(.11-(p.control-60)*.003,.025,.25);
     if(x<k){s.k++;s.outs++;}
     else if(x<k+.49)s.outs++;
     else if(x<k+.49+walk)s.walks++;
     else if(rng()<.29){s.allowed++;s.earned++;}
    }
    s.saves=f.role==='closer'&&s.allowed===0?1:0;
   }else{
    for(let i=0;i<f.opportunities;i++){
     s.pa++;
     const x=rng(),bb=.069+(p.contact-60)*.001,hit=.26+(p.contact-60)*.005,hr=.02+Math.max(0,p.power-58)*.003;
     if(x<bb){s.bb++;continue;}
     s.ab++;
     if(x<bb+hit){
      const bases=x<bb+hr?4:rng()<.27?2:1;
      s.h++;s.tb+=bases;s.hr+=bases===4?1:0;
      if(bases===4||rng()<.2)s.rbi++;
     }else if(rng()<.23)s.k++;
    }
   }
   return s;
  }
 }
 window.NightCareerDevelopment=CareerDevelopment;
})();
