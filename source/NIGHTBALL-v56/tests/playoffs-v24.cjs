const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;
for(const f of ['ratings-data','players','pennant','apbc-data','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
const readySeason=(clubId='owls',games=1)=>{const l=new NightPennant(clubId,games);for(;;){l.completeRound(l.simulate(l.fixture));if(l.completed)break;assert(l.next());}return l;};
const clone=l=>NightPennant.restore(JSON.parse(JSON.stringify(l)));
const win=(l,id)=>{const f=l.activeFixture;return l.completeActiveGame({leagueFixtureId:f.id,homeScore:f.home===id?2:0,awayScore:f.away===id?2:0,inning:2});};
(async()=>{
 // Every half-inning change waits, even with automatic defense enabled at 2x.
 for(const mode of ['match','pennant'])for(const userHome of [true,false]){
  const g=new NightGame(mode,'standard',()=>{},{userHome,defenseSpeed:2,innings:5});g.beginHalf();g.autoDefense=true;g.changeHalf();assert.equal(g.phase,'change');assert(g.autoDefense);assert.equal(g.halfBreak.half,'top');assert.equal(g.half,'bottom');const before=g.snapshot();for(let i=0;i<100;i++)g.update(50);assert.deepEqual(g.snapshot(),before,'scoreboard gate cannot time out');
  const saved=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{});assert.equal(saved.phase,'change');assert(saved.autoDefense);saved.update(5000);assert.equal(saved.phase,'change');saved.paused=true;assert(!saved.acknowledgeHalf());saved.paused=false;assert(saved.acknowledgeHalf());assert.equal(saved.halfBreak,null);assert.notEqual(saved.phase,'change');assert(!saved.acknowledgeHalf(),'double tap cannot skip another half');
  if(mode==='match'){saved.changeHalf();assert.equal(saved.inning,2);assert(saved.autoDefense);assert.equal(saved.phase,'change');saved.acknowledgeHalf();if(saved.defending){assert.equal(saved.phase,'aim');for(let i=0;i<15;i++)saved.update(50);assert(['windup','pitch'].includes(saved.phase),'automatic pitching resumes after tap');}}
 }
 const final=new NightGame('match','standard',()=>{},{innings:3});final.inning=3;final.half='top';final.homeScore=2;final.awayScore=1;final.changeHalf();assert.equal(final.phase,'ended','already decided game has a final result, not a nonexistent next half');
 // Actual CPU pitches complete a half, hold on the score, and retain the auto flag.
 const automatic=new NightGame('match','standard',()=>{},{defenseSpeed:2,fieldSpeed:2});automatic.beginHalf();assert(automatic.setAutoDefense(true));let frames=0;while(automatic.phase!=='change'&&automatic.phase!=='ended'&&frames++<20000)automatic.update(50);assert(frames<20000);assert.equal(automatic.phase,'change');assert(automatic.session.thrown>0);assert(automatic.autoDefense);
 // Old completed seasons upgrade in place, preserving games and ranking.
 const l=readySeason(),regular=JSON.stringify(l.results),standings=JSON.stringify(l.standings()),old=JSON.parse(JSON.stringify(l));delete old.postseason;const legacy=NightPennant.restore(old);assert(legacy.startPlayoffs());assert.equal(JSON.stringify(legacy.results),regular);assert(!legacy.startPlayoffs());
 const seeds=legacy.postseason.seeds.map(s=>s.clubId);assert.deepEqual([legacy.activeSeries.higher,legacy.activeSeries.lower],[seeds[1],seeds[2]]);assert.equal(legacy.activeSeries.target,2);assert.equal(legacy.activeFixture.home,seeds[1]);
 assert.throws(()=>legacy.completePlayoffGame({homeScore:1,awayScore:1}));assert.equal(legacy.activeSeries.games.length,0);
 assert(!legacy.completePlayoffGame({homeScore:2,awayScore:0,leagueFixtureId:'wrong'}));
 // Qualifier goes the full three games; final goes the full seven.
 assert(win(legacy,seeds[2]));assert(legacy.activeRoundDone);assert(!win(legacy,seeds[2]));assert(clone(legacy));assert(legacy.nextPlayoff());assert.equal(legacy.activeFixture.home,seeds[2]);
 assert(win(legacy,seeds[1]));assert(legacy.nextPlayoff());assert(win(legacy,seeds[2]));assert.equal(legacy.activeSeries.winner,seeds[2]);assert.equal(legacy.activeSeries.games.length,3);assert(clone(legacy));assert(legacy.nextPlayoff());assert.equal(legacy.postseason.stage,'final');assert.equal(legacy.activeSeries.higher,seeds[0]);assert.equal(legacy.activeSeries.lower,seeds[2]);assert.equal(legacy.activeSeries.target,4);assert.deepEqual(legacy.activeSeries.wins,{[seeds[0]]:0,[seeds[2]]:0});
 for(let i=0;i<7;i++){const id=i%2?seeds[2]:seeds[0];assert(win(legacy,id));assert(clone(legacy),'restore after final game '+(i+1));if(i<6){assert(!legacy.postseasonCompleted);assert(legacy.nextPlayoff());}}
 assert(legacy.postseasonCompleted);assert.equal(legacy.postseason.champion,seeds[0]);assert.equal(legacy.activeFixture.game,7);assert.equal(legacy.activeSeries.games.length,7);assert(!legacy.nextPlayoff());assert(!legacy.completePlayoffGame({homeScore:1,awayScore:0}));assert.equal(JSON.stringify(legacy.results),regular);assert.equal(JSON.stringify(legacy.standings()),standings,'playoff results never change league win/run-difference standings');
 // Sweeps stop immediately; any seed can win both stages.
 for(const lowerWins of [false,true]){const q=readySeason();assert(q.startPlayoffs());const ss=q.postseason.seeds.map(s=>s.clubId),winner=ss[lowerWins?2:1];for(let i=0;i<2;i++){assert(win(q,winner));if(i===0)assert(q.nextPlayoff());}assert.equal(q.activeSeries.games.length,2);assert(q.nextPlayoff());for(let i=0;i<4;i++){assert(win(q,winner));if(i<3)assert(q.nextPlayoff());}assert.equal(q.postseason.champion,winner);assert.equal(q.activeSeries.games.length,4);assert(clone(q));}
 // First-place team waits through CPU qualifiers; nonqualifiers can follow the full tournament.
 for(const rank of [0,3]){const q=readySeason();q.clubId=q.standings()[rank].id;q.startPlayoffs();assert(!q.userInActiveFixture);assert(q.simulatePlayoffGame());assert(q.activeRoundDone);assert(q.nextPlayoff());assert(clone(q));}
 const q=readySeason();q.startPlayoffs();q.clubId=q.activeFixture.home;assert(q.userInActiveFixture);assert(!q.simulatePlayoffGame(),'own fixtures must be played');q.currentGame={fixture:q.activeFixture.id};assert.deepEqual(clone(q).currentGame,q.currentGame);
 const damaged=JSON.parse(JSON.stringify(legacy));damaged.postseason.final.wins[seeds[0]]=99;assert.equal(NightPennant.restore(damaged),null);
 const {playoffHTML}=await import('../dist/playoff-view.js');assert(playoffHTML(legacy).includes('4勝先取'));assert(playoffHTML(legacy).includes('PLAYOFF CHAMPION'));
 console.log('PASS V24: tap-gated half changes/save/double-tap, sticky 2x auto defense with live CPU innings; legacy season upgrade; 2-v-3 best-of-3, seed1 final best-of-7, sweeps/full series, advancing/waiting/CPU games, saved bracket validation, isolated standings and champion.');
})().catch(e=>{console.error(e);process.exit(1)});
