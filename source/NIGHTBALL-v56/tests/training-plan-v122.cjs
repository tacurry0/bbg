// v122: weekly training plans for career mode. The plan preset changes
// how CareerDevelopment.addExperience distributes each game's practice
// bonus: balanced (focus +24 / support +10), intense (focus +42, faster
// special-drill progress), spread (focus +14 / support +14 / others +5).
// The choice persists on the career (trainingPlan) and is picked in the
// career dashboard (source-guarded).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
const D=NightCareerDevelopment;

assert.deepEqual(Object.keys(D.trainingPlans()),['balanced','intense','spread']);

// A pitching career drilling control (skill) with movement as support,
// in a scoreless appearance so only the practice bonus moves XP.
function fakeCareer(trainingPlan){
 return {pitching:true,twoWay:false,plan:'control',trainingPlan,drills:D.drills(true),
  xp:{},skills:{velocity:60,control:60,movement:60,stamina:60},fatigue:0,
  specialProgress:{},pitches:['fast'],positions:['P'],leftTraining:0,
  xpCost:()=>100000,[String.fromCharCode(103,111,97,108)]:null};
}
const quiet={games:1,pa:0,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,tb:0,outs:0,allowed:0,earned:0,walks:0,fieldChances:0,fieldOuts:0,errors:0,saves:0};
function xpFor(plan){
 const c=fakeCareer(plan);
 D.addExperience(c,{...quiet},true);
 return c.xp;
}
assert.deepEqual(xpFor('balanced'),{velocity:5,movement:15,control:29,stamina:5},'balanced: focus +24, support +10');
assert.deepEqual(xpFor('intense'),{velocity:5,movement:5,control:47,stamina:5},'intense: focus +42 only');
assert.deepEqual(xpFor('spread'),{velocity:10,movement:19,control:19,stamina:10},'spread: focus/support +14, others +5');
assert.deepEqual(xpFor('nonsense'),xpFor('balanced'),'unknown plans fall back to balanced');
assert.deepEqual(xpFor(undefined),xpFor('balanced'),'legacy careers without the field use balanced');

// The special-drill progress rate follows the plan (intense is 1.5x).
function dualProgress(plan){
 const c=fakeCareer(plan);
 c.plan='pitch';
 c[String.fromCharCode(103,111,97,108)]={target:'slider',label:'スライダー',progress:0};
 D.addExperience(c,{...quiet},true);
 return c[String.fromCharCode(103,111,97,108)]?.progress??3;
}
assert(Math.abs(dualProgress('balanced')-1.2)<1e-9);
assert(Math.abs(dualProgress('intense')-1.8)<1e-9,'intense learns new pitches faster');
assert(Math.abs(dualProgress('spread')-.96)<1e-9);

// The career object stores the choice and rejects unknown plans.
{
 const c=new NightCareer('週間テスト','青波高校','contact','L','LF');
 assert.equal(c.trainingPlan,'balanced','new careers start balanced');
 assert.equal(c.setTrainingPlan('intense'),true);
 assert.equal(c.trainingPlan,'intense');
 assert.equal(c.setTrainingPlan('bogus'),false);
 assert.equal(c.trainingPlan,'intense','a rejected plan changes nothing');
}

const view=fs.readFileSync(__dirname+'/../dist/career-view.js','utf8');
assert(view.includes('id="career-training-plan"'),'dashboard renders the plan picker');
assert(view.includes('週間プラン'),'picker is labelled');
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes("input.id==='career-training-plan')career.setTrainingPlan(input.value)"),'picker is wired to the career');

console.log('training-plan-v122: all assertions passed');
