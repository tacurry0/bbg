const assert=require('node:assert/strict');
global.window=global;
const modules=['ratings-data','players','pro-parks','pennant','npb-postseason','npb-data','npb-rosters','kbo-data','kbo-rosters',
 'career-leagues','career-development','career-life','career-extras','career','game',
 'career-world-data','career-world-identities','career-world-leagues','career-world-international','career-world-school','career-world-match','career-world-save','career-world-success','career-world','career-world-slots','career-world-view'];
for(const file of modules)require('../dist/'+file+'.js');
const D=NightCareerWorldData,W=NightCareerWorld,Z=NightCareerWorldSuccess;
for(const country of ['jp','tw','kr']){
 const w=new W({country,name:{jp:'早瀬 悠馬',tw:'陳承翰',kr:'キム・ハジュン'}[country],region:D.countries[country].region[0],style:'contact',schoolTier:1,difficulty:'normal',seed:'story-v250-'+country});
 const drain=()=>{let n=0;while(w.success.pending){assert(Z.choose(w,0));assert(++n<40);}};
 Z.activate(w);assert.equal(w.success.pending.id,'entrance');const from=w.day;assert.equal(w.run('season'),0);assert.equal(w.day,from);assert(!Z.direct(w,'contact'));
 const saved=W.restore(NightCareerWorldSave.decode(NightCareerWorldSave.encode(w)));assert.equal(saved.success.pending.id,'entrance');assert(Z.choose(saved,0));
 drain();assert(!w.success.pending);assert(w.success.arc.entry===0);
 const p=Z.preview(w,'contact');assert.equal(p.level,1);assert(p.partnerId);assert(Z.direct(w,'contact'));
 drain();
 for(let i=0;i<100&&w.grade===1;i++){w.run('season');drain();if(w.queue)assert(w.finishDay());drain();}
 assert.equal(w.grade,2);assert(w.success.eventSeen['grade/2']);assert(w.success.eventSeen['rival-2']);
 w.player.contact=50;w.experience=60;assert(Z.learnPerk(w,'average'));assert(w.perks.includes('average'));
 assert(Number.isFinite(w.skillPotential('contact').cap));
 console.log('PASS forced story progression, save, queue blocking, relationship training and perks:',country);
}
