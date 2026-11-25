// v132: random roster matches (checker item "random-roster-match").
// For a regular versus match, both clubs keep their identity but their
// players are drawn from the cross-league pool (NightTeams.matchTeams:
// CPBL + NPB + KBO). Covered here: seeded reproducibility, every
// defensive position filled by an eligible player with no duplicates
// inside or across teams, roster sizes and club identity preserved,
// foreign-club players actually appearing, the source rosters left
// untouched, OFF behaviour identical to the pre-v132 game, a match
// starting (and being restored from a snapshot) with drawn clubs, and
// the app wiring (setup toggle, regular-match-only scope, version pins).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','game.js','random-roster.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const R=global.NightRandomRoster;
assert(R,'NightRandomRoster module loads');
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const poolClubs=NightTeams.matchTeams;
assert(poolClubs.length>=30,'pool spans CPBL + NPB + KBO clubs');
const origin=new Map();
for(const c of poolClubs){for(const p of c.batters)origin.set(p.id,c.id);for(const p of c.pitchers)origin.set(p.id,c.id);}
const owls=NightTeams.get('owls'),giants=NightTeams.get('npb-g');
const owlsBefore=JSON.stringify(owls),giantsBefore=JSON.stringify(giants);

// ---------- seeded draw is reproducible ----------
const a=R.buildMatch(owls,giants,poolClubs,42);
const b=R.buildMatch(owls,giants,poolClubs,42);
const shape=m=>[m.home,m.away].map(c=>({batters:c.batters.map(p=>p.id),pitchers:c.pitchers.map(p=>p.id),order:c.startingOrder,fielding:c.startingFielding}));
assert.deepEqual(shape(a),shape(b),'same seed draws the same two rosters');
const c43=R.buildMatch(owls,giants,poolClubs,43);
assert.notDeepEqual(shape(c43),shape(a),'a different seed draws a different roster');

// ---------- validity of every drawn club ----------
for(const [base,club] of [[owls,a.home],[giants,a.away]]){
 assert.equal(club.id,base.id,'club id (identity) is preserved');
 assert.equal(club.name,base.name,'club name is preserved');
 assert.equal(club.short,base.short,'club short name is preserved');
 assert.equal(club.logo,base.logo,'club logo is preserved');
 assert.equal(club.color,base.color,'club colours are preserved');
 assert.equal(club.batters.length,base.batters.length,'batter count matches the base club');
 assert.equal(club.pitchers.length,base.pitchers.length,'pitcher count matches the base club');
 assert.deepEqual(Object.keys(club.startingFielding).sort(),POS.slice().sort(),'all nine positions are filled');
 assert.equal(new Set(Object.values(club.startingFielding)).size,9,'no player covers two positions');
 assert.equal(new Set(club.startingOrder).size,9,'batting order has nine distinct starters');
 assert.deepEqual(club.startingOrder.slice().sort(),Object.values(club.startingFielding).slice().sort(),'the order is exactly the nine starters');
 for(const [pos,id] of Object.entries(club.startingFielding)){
  const player=club.batters.find(p=>p.id===id);
  assert(player,'starter at '+pos+' is on the club');
  assert(R.eligible(player,pos),`starter at ${pos} (${player.name}, natural ${player.pos}) is eligible for the position`);
 }
 assert(club.pitchers.every(p=>p.pos==='P'),'pitchers are drawn from the pitcher pool only');
}
const allIds=m=>[m.home,m.away].flatMap(c=>[...c.batters,...c.pitchers].map(p=>p.id));
assert.equal(new Set(allIds(a)).size,allIds(a).length,'no player appears twice within or across the two teams');

// ---------- the pool is really cross-club ----------
for(const [base,club] of [[owls,a.home],[giants,a.away]]){
 const foreign=club.batters.filter(p=>origin.get(p.id)!==base.id);
 assert(foreign.length>0,`${base.id} drew players from other clubs (seed 42)`);
}
let foreignStarts=0;
for(let seed=1;seed<=20;seed++){
 const m=R.buildMatch(owls,giants,poolClubs,seed);
 for(const [base,club] of [[owls,m.home],[giants,m.away]])if(club.batters.some(p=>origin.get(p.id)!==base.id))foreignStarts++;
}
assert(foreignStarts>=30,'across 20 seeds both sides regularly field foreign players ('+foreignStarts+'/40)');

// ---------- source rosters are not mutated ----------
assert.equal(JSON.stringify(owls),owlsBefore,'drawing does not mutate the home base club');
assert.equal(JSON.stringify(giants),giantsBefore,'drawing does not mutate the away base club');

// ---------- OFF: the game is exactly the pre-v132 game ----------
const plain=new NightGame('match','standard',()=>{},{homeTeamId:'owls',awayTeamId:'foxes',userHome:true});
assert.equal(plain.randomRoster,false,'randomRoster defaults to false');
assert.deepEqual(plain.lineups.home.map(p=>p.id),NightGame.arrangeLineup(NightTeams.get('owls')).map(p=>p.id),'OFF home lineup is the stock lineup');
assert.deepEqual(plain.lineups.away.map(p=>p.id),NightGame.arrangeLineup(NightTeams.get('foxes')).map(p=>p.id),'OFF away lineup is the stock lineup');
assert.deepEqual(plain.teams.home.batters.map(p=>p.id),NightTeams.get('owls').batters.map(p=>p.id),'OFF home roster is the stock roster');

// ---------- a match starts with drawn clubs and survives a snapshot ----------
const drawn=R.buildMatch(owls,giants,poolClubs,7);
const userConfig={order:drawn.home.startingOrder,fielding:drawn.home.startingFielding,pitcher:0};
const g=new NightGame('match','standard',()=>{},{clubs:{home:drawn.home,away:drawn.away},homeTeamId:'owls',awayTeamId:'npb-g',userHome:true,randomRoster:true,...userConfig});
assert.equal(g.randomRoster,true);
assert.deepEqual(g.lineups.home.map(p=>p.id),drawn.home.startingOrder,'user lineup follows the drawn order');
assert.deepEqual(g.lineups.home.map(p=>p.fieldPos),drawn.home.startingOrder.map(id=>Object.keys(drawn.home.startingFielding).find(pos=>drawn.home.startingFielding[pos]===id)),'user fielding follows the draw');
assert.equal(g.lineups.away.length,9,'opponent lineup is complete');
assert(g.batter&&g.pitcher,'batter and pitcher resolve in the drawn match');
assert.equal(new Set([...g.participants.home,...g.participants.away]).size,18,'participants are distinct across both teams');
const restored=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{});
assert(restored,'drawn match restores from a snapshot');
assert.deepEqual(restored.lineups.home.map(p=>p.id),g.lineups.home.map(p=>p.id),'restored home lineup keeps the drawn players');
assert.deepEqual(restored.lineups.away.map(p=>p.id),g.lineups.away.map(p=>p.id),'restored away lineup keeps the drawn players');
assert.deepEqual(restored.teams.home.batters.map(p=>p.id),drawn.home.batters.map(p=>p.id),'restored home roster keeps the drawn roster');

// ---------- app wiring ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(app.includes('randomRoster:false'),'random roster setting defaults to OFF');
assert(app.includes('data-toggle="randomRoster"'),'setup screen exposes the random roster toggle');
assert(app.includes("mode==='match'&&settings.randomRoster"),'the draw is scoped to regular versus matches');
assert(app.includes('NightRandomRoster.buildMatch'),'the app draws through NightRandomRoster');
assert(app.includes('if(randomClubs)randomMatch=null;'),'a started match consumes the draw, so a rematch draws again');
assert(!app.includes("mode==='pennant'&&settings.randomRoster"),'pennant never draws random rosters');
assert(index.includes('./random-roster.js?v=1'),'index loads the random roster module');
assert(index.includes('./game.js?v=170')&&index.includes('./app.js?v=170'),'index pins move to v133');
assert(sw.includes("nightball-v170-leaders-sort"),'SW cache renamed for v133');
assert(sw.includes('./random-roster.js?v=1'),'SW precaches the random roster module');
console.log('PASS: seeded reproducibility, position-eligible full lineups with no duplicates, cross-club pool, roster sizes/identity preserved, OFF identical to stock, drawn match starts and restores, app wiring + v132 pins.');
