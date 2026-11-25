// v164: new-pitch learning (checker item "new-pitch-learning"). Distinct
// from mastery (v121, existing pitches improve): a pitch the pitcher does
// not own yet is ADDED to the repertoire.
//  Pennant: NightPennant.trainNewPitch — user-club pitchers only, any
//  unowned pitch type may be targeted, at most 5 pitches total, one
//  attempt per pitcher per round, success is probabilistic (seeded by
//  default; tests inject rolls), the 4th attempt on a target always
//  succeeds. Learned pitches persist in learnedPitches and clubRoster
//  folds them into the repertoire, so they reach the in-game pitch deck.
//  Classic career: the pre-existing 'pitch' drill (setPlan + experience
//  progress) is verified end to end here — progress-gated (not instant),
//  capped at 5, saved/restored, and present in player()/the game deck.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
const D=NightCareerDevelopment;

// ---------- Pennant: validation, probability, cooldown, pity ----------
{
 const league=new NightPennant('comets');
 const roster=league.clubRoster(league.clubId),pitcher=roster.pitchers[0],pid=pitcher.id;
 const owned=pitcher.pitches.slice();
 const target=league.learnablePitches(pid)[0];
 assert(target&&!owned.includes(target),'a learnable target exists');
 assert.equal(league.trainNewPitch(pid,'no-such-pitch',0),false,'unknown pitch rejected');
 assert.equal(league.trainNewPitch(pid,owned[0],0),false,'already-owned pitch rejected');
 assert.equal(league.trainNewPitch(roster.batters[0].id,target,0),false,'batters cannot learn pitches');
 const other=league.clubRoster(league.clubs.find(c=>c.id!==league.clubId).id);
 assert.equal(league.trainNewPitch(other.pitchers[0].id,target,0),false,'opponent pitchers are out of scope');
 const chance=league.learnChance(pid);
 assert(chance>=.2&&chance<=.6,'chance is bounded: '+chance);
 // Fixed roll above the chance: the attempt fails and is recorded.
 const failed=league.trainNewPitch(pid,target,.999);
 assert.equal(failed.learned,false,'a high roll fails (not instant)');
 assert.equal(failed.attempts,1);
 assert(!league.clubRoster(league.clubId).pitchers.find(p=>p.id===pid).pitches.includes(target),'failed attempt adds nothing');
 // One attempt per pitcher per round.
 assert.equal(league.trainNewPitch(pid,target,0),false,'second attempt in the same round is blocked');
 // Next round, a low roll succeeds.
 league.round++;
 const learned=league.trainNewPitch(pid,target,0);
 assert.equal(learned.learned,true,'a low roll succeeds');
 assert(league.clubRoster(league.clubId).pitchers.find(p=>p.id===pid).pitches.includes(target),'learned pitch is in the repertoire');
 assert.deepEqual(league.learnedPitches[pid],[target]);
 // Success also consumes the round's training slot.
 const second=league.learnablePitches(pid)[0];
 assert.equal(league.trainNewPitch(pid,second,0),false,'no second pitch in the same round');
 // Pity: three failures on one target make the fourth attempt certain.
 const pity=new NightPennant('comets'),pp=pity.clubRoster(pity.clubId).pitchers[1],ptid=pp.id,pt=pity.learnablePitches(ptid)[0];
 for(let i=0;i<3;i++){const r=pity.trainNewPitch(ptid,pt,.999);assert.equal(r.learned,false,'pity setup failure '+(i+1));pity.round++;}
 const fourth=pity.trainNewPitch(ptid,pt,.999);
 assert.equal(fourth.chance,1,'fourth attempt is guaranteed');
 assert.equal(fourth.learned,true,'pity attempt succeeds even on a high roll');
 // Seeded default roll: two leagues with the same id agree on the outcome.
 const a=new NightPennant('comets'),b=new NightPennant('comets');b.id=a.id;
 const ap=a.clubRoster(a.clubId).pitchers[2],at=a.learnablePitches(ap.id)[0];
 assert.equal(a.trainNewPitch(ap.id,at).learned,b.trainNewPitch(ap.id,at).learned,'default roll is seeded and reproducible');
 // Cap: a pitcher never exceeds 5 pitches.
 const capped=new NightPennant('comets'),cp=capped.clubRoster(capped.clubId).pitchers[0];
 capped.learnedPitches[cp.id]=capped.learnablePitches(cp.id).slice(0,NightPennant.LEARN_MAX_PITCHES-(cp.pitches||[]).length);
 assert.equal(capped.clubRoster(capped.clubId).pitchers.find(p=>p.id===cp.id).pitches.length,NightPennant.LEARN_MAX_PITCHES,'learned pitches fill up to the cap');
 assert.deepEqual(capped.learnablePitches(cp.id),[],'nothing learnable at the cap');
 assert.equal(capped.trainNewPitch(cp.id,'knuckle',0),false,'training is blocked at the cap');
}

// ---------- Pennant: save/restore and legacy saves ----------
{
 const league=new NightPennant('comets');
 const pitcher=league.clubRoster(league.clubId).pitchers[0],target=league.learnablePitches(pitcher.id)[0];
 league.trainNewPitch(pitcher.id,target,0);
 const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
 assert.deepEqual(restored.learnedPitches[pitcher.id],[target],'learned pitches survive save/restore');
 assert(restored.clubRoster(restored.clubId).pitchers.find(p=>p.id===pitcher.id).pitches.includes(target),'restored repertoire includes the learned pitch');
 const legacy=JSON.parse(JSON.stringify(league));delete legacy.learnedPitches;delete legacy.pitchLearning;
 const old=NightPennant.restore(legacy);
 assert(old,'legacy save without the new fields restores');
 assert.deepEqual(old.learnedPitches,{},'legacy saves gain an empty learnedPitches map');
 assert.deepEqual(old.pitchLearning,{},'legacy saves gain an empty pitchLearning map');
 const t2=old.learnablePitches(pitcher.id)[0];
 assert.equal(old.trainNewPitch(pitcher.id,t2,0).learned,true,'legacy-restored leagues can still learn');
}

// ---------- Pennant: the learned pitch reaches the deck and is thrown ----------
{
 const league=new NightPennant('comets');
 const home=league.clubRoster(league.clubId),away=league.clubRoster(league.clubs.find(c=>c.id!==league.clubId).id);
 const idx=0,pid=home.pitchers[idx].id,target=league.learnablePitches(pid)[0];
 league.trainNewPitch(pid,target,0);
 const clubs={home:league.clubRoster(league.clubId),away};
 const g=new NightGame('match','standard',()=>{},{clubs,homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:5,park:home.park,pitcher:idx,opponentPitcher:0,order:clubs.home.startingOrder,fielding:clubs.home.startingFielding});
 assert(g.pitcher.pitches.includes(target),'the game pitcher repertoire includes the learned pitch');
 g.half='top';g.setPhase('aim');g.pitchType=target;
 assert(g.throwPitch(),'the learned pitch can actually be thrown');
 for(let i=0;i<3000&&!(g.pitchUsage[pid]?.[target]>0);i++)g.update(50);
 assert(g.pitchUsage[pid][target]>=1,'the learned pitch completed and was counted: '+JSON.stringify(g.pitchUsage[pid]));
}

// ---------- Classic career: existing drill, verified end to end ----------
{
 const c=new NightCareer('テスト太郎',NightCareer.schools[0],'velocity','R');
 assert(c.pitching&&c.pitches.length===3,'career pitcher starts with 3 pitches');
 const options=c.plans('pitch').map(([id])=>id);
 assert(options.length===NightGame.TYPES.length-3,'every unowned type is a career target');
 const target=options.includes('curve')?'curve':options[0];
 assert(c.setPlan('pitch',target),'career pitch drill can be selected');
 const stat=()=>{const s=D.blank();s.games=1;s.outs=9;s.k=3;return s;};
 D.addExperience(c,stat(),true);
 assert(!c.pitches.includes(target),'one game of practice is not instant learning');
 D.addExperience(c,stat(),true);D.addExperience(c,stat(),true);
 assert(c.pitches.includes(target),'progress completes the learning');
 assert(c.player().pitches.includes(target),'the learned pitch is on the career player');
 const restored=NightCareer.restore(JSON.parse(JSON.stringify(c.save())));
 assert(restored&&restored.pitches.includes(target),'career learned pitch survives save/restore');
 const legacy=JSON.parse(JSON.stringify(c.save()));delete legacy.pitches;
 const old=NightCareer.restore(legacy);
 assert(old&&Array.isArray(old.pitches),'legacy career saves without pitches still restore');
 // Career cap: at 5 pitches no further targets are offered.
 const full=new NightCareer('テスト次郎',NightCareer.schools[0],'velocity','R');
 full.pitches=['fast','slider','fork','curve','change'];
 assert.deepEqual(full.plans('pitch'),[],'career offers no targets at the 5-pitch cap');
}

// ---------- Wiring / pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('data-learn-pitch'),'pennant roster UI offers new-pitch training');
assert(app.includes('league.trainNewPitch('),'UI calls the pennant learning action');
assert(app.includes('learnPitchHTML(selected'),'roster shows the learning section');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8'),sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(index.includes('./game.js?v=170')&&index.includes('./app.js?v=170'),'index pins at v164');
assert(index.includes('./pennant.js?v=86'),'index pin for the changed pennant.js moves');
assert(sw.includes('nightball-v170-leaders-sort'),'SW cache renamed for v164');
assert(sw.includes('./pennant.js?v=86')&&sw.includes('./app.js?v=170'),'SW precaches the v164 scripts');

console.log('new-pitch-v164: all assertions passed');
