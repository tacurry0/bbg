const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;
for(const f of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
assert.deepEqual(NightTeams.all.map(c=>c.name),['中信兄弟','味全ドラゴンズ','統一ライオンズ','富邦ガーディアンズ','樂天モンキーズ','台鋼ホークス']);
for(const c of NightTeams.all)assert(fs.existsSync('dist/'+c.logo.slice(2)));
function loaded(mask=7,outs=0){const g=new NightGame('match','standard',()=>{});g.half='bottom';g.outs=outs;g.home[0]=0;g.bases=[0,1,2].map(i=>!!(mask&(1<<i)));g.baseIds=g.bases.map((v,i)=>v?g.lineups.home[i+5].id:null);return g;}
for(let mask=0;mask<8;mask++)for(const [kind,n]of [['single',1],['double',2],['triple',3],['hr',4]]){
 const g=loaded(mask,2),before=g.baseIds.slice(),batter=g.batter.id;g.startField(28,10,0,false);
 for(let j=0;j<150;j++)g.updateRunners(.02);
 assert(g.field.runners[0].progress<=1,'batter must not round first before a hit is credited');
 g.finishBall(kind);for(let j=0;j<1500;j++)g.updateRunners(.02);
 const expected=[null,null,null];let runs=0;
 for(let i=0;i<3;i++)if(before[i]){if(i+n>=3)runs++;else expected[i+n]=before[i];}
 if(n===4)runs++;else expected[n-1]=batter;
 assert.deepEqual(g.baseIds,expected);assert.equal(g.homeScore,runs);
 for(const r of g.field.runners){assert.equal(r.progress,Math.min(4,r.start+n));const dest=NightGame.BASES[Math.min(4,r.start+n)];assert.equal(r.x,dest.x);assert.equal(r.y,dest.y);}
}
// Forced runners break on contact with any out count and return on a catch with fewer than two outs.
for(const outs of [0,1,2]){const g=loaded(7,outs);g.startField(25,60,0,false);g.updateRunners(1);const runners=g.field.runners.filter(r=>!r.batter);assert(runners.every(r=>r.progress>r.start));const positions=runners.map(r=>r.progress);g.finishBall('flyout');for(let i=0;i<500;i++)g.updateRunners(.02);assert.deepEqual(runners.map(r=>r.progress),outs===2?positions:[1,2,3]);assert.deepEqual(g.baseIds,g.lineups.home.slice(5,8).map(p=>p.id));}
// Repeated loaded walks preserve each identity and force only occupied paths.
for(let mask=0;mask<8;mask++){const g=loaded(mask),old=g.baseIds.slice(),id=g.batter.id;g.walk();const expected=old.slice();if(old[0]){expected[1]=old[0];if(old[1])expected[2]=old[1];}expected[0]=id;assert.deepEqual(g.baseIds,expected);assert.equal(g.homeScore,mask===7?1:0);}
const g=loaded(7,2);g.startField(20,10,0,false);g.field.runners[0].speed=50;g.field.runners[1].speed=1;g.field.ball.bounces=1;g.finishBall('single');for(let i=0;i<200;i++){g.updateRunners(.02);const active=g.field.runners.filter(r=>!r.out&&r.progress<4).sort((a,b)=>a.start-b.start);for(let j=1;j<active.length;j++)assert(active[j].progress-active[j-1].progress>=.1199);}
console.log('PASS: CPBL identity/assets; every base occupancy for 1B/2B/3B/HR; runner identity/score/positions agree; two-out fly running; forced walks; no overtaking.');
