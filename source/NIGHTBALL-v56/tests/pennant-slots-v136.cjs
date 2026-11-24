// v136 pennant save slots (checker item "pennant-save-slots"):
//  - slot 1 is the legacy key itself: a pre-v136 save (only the old key in
//    storage) is slot 1, restores unchanged, and its bytes are never moved,
//  - a second pennant in slot 2 of the same league progresses and saves
//    independently of slot 1 (and vice versa),
//  - deleting a slot removes only that slot,
//  - custom leagues get the same treatment under their league-id key,
//  - slot metadata (club / played / total / savedAt) reads from save data,
//  - backup compatibility: every slot key starts with "nightball." so the
//    existing backup export (all nightball.* keys) includes them,
//  - app wiring + v136 pins (pennant.js pin moves because it changed).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','pennant','npb-data','npb-rosters','kbo-data','kbo-rosters','league-editor']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
const S=NightPennantSlots;
function memStorage(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),keys:()=>[...mem.keys()]};}
const playOne=p=>{assert(p.completeRound(p.simulate(p.fixture)));if(!p.completed)assert(p.next());};

// ---------- key design ----------
assert.equal(S.COUNT,3);
assert.equal(S.baseKey('cpbl'),'nightball.pennant','CPBL keeps the original legacy key');
assert.equal(S.key('cpbl',1),'nightball.pennant','slot 1 is the legacy CPBL key itself');
assert.equal(S.key('cpbl',2),'nightball.pennant.slot2');
assert.equal(S.key('cpbl',3),'nightball.pennant.slot3');
assert.equal(S.key('kbo',1),'nightball.pennant.kbo');
assert.equal(S.key('kbo',2),'nightball.pennant.kbo.slot2');
assert.equal(S.key('npb-central',3),'nightball.pennant.npb-central.slot3');
assert.equal(S.key('cpbl',99),'nightball.pennant','out-of-range slots clamp to slot 1');
for(const id of ['cpbl','kbo','npb-central'])for(let n=1;n<=3;n++)assert(S.key(id,n).startsWith('nightball.'),'slot keys stay inside the backup prefix');

// ---------- legacy save becomes slot 1 with no migration ----------
{
 const store=memStorage();
 const legacy=new NightPennant('owls',2);
 playOne(legacy);
 const legacyJson=JSON.stringify(legacy); // exactly what pre-v136 wrote: no updatedAt
 store.setItem('nightball.pennant',legacyJson);
 assert.equal(S.getActive(store,'cpbl'),1,'no active-slot record defaults to slot 1');
 const list=S.list(store,'cpbl');
 assert.equal(list.length,3);
 assert.equal(list[0].exists,true);assert.equal(list[0].valid,true);
 assert.equal(list[0].clubId,'owls');assert.equal(list[0].played,1);
 assert.equal(list[0].totalGames,legacy.totalGames);
 assert.equal(list[0].savedAt,legacy.createdAt,'legacy saves fall back to createdAt for the saved-time display');
 assert.equal(list[1].exists,false);assert.equal(list[2].exists,false);
 const restored=S.restore(store,'cpbl',1);
 assert(restored,'legacy save restores through slot 1');
 assert.equal(restored.clubId,'owls');assert.equal(restored.played,1);
 assert.equal(store.getItem('nightball.pennant'),legacyJson,'reading slot 1 never rewrites the legacy bytes');
 // Progress made in slot 1 still writes back to the legacy key.
 playOne(restored);
 assert.equal(S.write(store,'cpbl',1,restored),true);
 const again=S.restore(store,'cpbl',1);
 assert.equal(again.played,2,'slot 1 progress persists in the legacy key');
 assert.equal(JSON.parse(store.getItem('nightball.pennant')).updatedAt,again.updatedAt,'writes stamp updatedAt');
 assert.equal(S.list(store,'cpbl')[0].savedAt,again.updatedAt,'slot list shows the stamped save time');
}

// ---------- slot 2 is independent of slot 1 ----------
{
 const store=memStorage();
 const a=new NightPennant('owls',2);playOne(a);playOne(a);
 assert(S.write(store,'cpbl',1,a));
 const slot1Bytes=store.getItem(S.key('cpbl',1));
 const b=new NightPennant('foxes',2);
 assert(S.write(store,'cpbl',2,b));
 assert.equal(store.getItem(S.key('cpbl',1)),slot1Bytes,'creating slot 2 does not touch slot 1');
 playOne(b);
 assert(S.write(store,'cpbl',2,b));
 const ra=S.restore(store,'cpbl',1),rb=S.restore(store,'cpbl',2);
 assert.equal(ra.clubId,'owls');assert.equal(ra.played,2,'slot 1 keeps its own progress');
 assert.equal(rb.clubId,'foxes');assert.equal(rb.played,1,'slot 2 progresses independently');
 assert.notEqual(ra.id,rb.id);
 playOne(ra);assert(S.write(store,'cpbl',1,ra));
 assert.equal(S.restore(store,'cpbl',2).played,1,'saving slot 1 does not leak into slot 2');
 // Active-slot memory is per league.
 S.setActive(store,'cpbl',2);assert.equal(S.getActive(store,'cpbl'),2);
 assert.equal(S.getActive(store,'kbo'),1,'other leagues keep their own active slot');
 // Deleting slot 2 leaves slot 1 (and the active record handling) intact.
 assert.equal(S.remove(store,'cpbl',2),true);
 assert.equal(store.getItem(S.key('cpbl',2)),null);
 assert.equal(S.restore(store,'cpbl',2),null);
 const still=S.restore(store,'cpbl',1);
 assert(still&&still.clubId==='owls'&&still.played===3,'deleting slot 2 does not affect slot 1');
 assert.equal(S.list(store,'cpbl')[1].exists,false);
 assert.equal(S.anyExists(store,'cpbl'),true);
 assert.equal(S.remove(store,'cpbl',1),true);
 assert.equal(S.anyExists(store,'cpbl'),false,'deleting the last slot empties the league');
}

// ---------- other leagues and custom leagues ----------
{
 const store=memStorage();
 const kbo=new NightPennant('kbo-hh',2);playOne(kbo);
 store.setItem('nightball.pennant.kbo',JSON.stringify(kbo)); // legacy per-league key
 const restored=S.restore(store,'kbo',1);
 assert(restored&&restored.leagueId==='kbo','legacy KBO save is slot 1 of its league');
 const kbo2=new NightPennant('kbo-ss',2);
 assert(S.write(store,'kbo',3,kbo2));
 assert.equal(S.restore(store,'kbo',3).clubId,'kbo-ss');
 assert.equal(S.restore(store,'kbo',1).clubId,'kbo-hh','KBO slots stay independent');

 const def={name:'スロットリーグ',clubIds:['owls','foxes','falcons','mariners'],gamesPerOpponent:2,dh:true,playoffs:true};
 const savedDef=NightLeague.upsert(def,memStorage());
 assert(savedDef,'custom league definition saves');
 const custom=new NightPennant('falcons',2,{customLeague:savedDef});
 store.setItem(S.key(savedDef.id,1),JSON.stringify(custom)); // legacy-style key for the custom league
 const rc=S.restore(store,savedDef.id,1);
 assert(rc&&rc.leagueId===savedDef.id&&rc.clubId==='falcons','custom-league legacy save is slot 1');
 const custom2=new NightPennant('owls',2,{customLeague:savedDef});
 assert(S.write(store,savedDef.id,2,custom2));
 assert.equal(S.restore(store,savedDef.id,2).clubId,'owls');
 assert.equal(S.restore(store,savedDef.id,1).clubId==='falcons',true,'custom-league slot 1 untouched by slot 2');
 S.remove(store,savedDef.id,1);
 assert.equal(S.restore(store,savedDef.id,1),null);
 assert(S.restore(store,savedDef.id,2),'deleting custom slot 1 leaves slot 2');
 NightLeague.remove(savedDef.id,memStorage());
}

// ---------- corrupt data in a slot never breaks the others ----------
{
 const store=memStorage();
 const good=new NightPennant('wolves',2);
 assert(S.write(store,'cpbl',1,good));
 store.setItem(S.key('cpbl',2),'{"schema":3,"leagueId":"cpbl"'); // truncated JSON
 store.setItem(S.key('cpbl',3),JSON.stringify({schema:99}));
 const list=S.list(store,'cpbl');
 assert.equal(list[1].exists,true);assert.equal(list[1].valid,false,'corrupt slot is listed as unreadable, not fatal');
 assert.equal(list[2].valid,false);
 assert.equal(S.restore(store,'cpbl',2),null);
 assert(S.restore(store,'cpbl',1),'slot 1 still restores with corrupt neighbours');
}

// ---------- app wiring + v136 pins ----------
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
 assert(app.includes('NightPennantSlots.key(id,slot)'),'app derives save keys from NightPennantSlots');
 assert(app.includes('NightPennantSlots.restore(localStorage,id,leagueSlot)'),'app loads the active slot');
 assert(app.includes('NightPennantSlots.write(localStorage,league.leagueId,leagueSlot,league)'),'app saves into the active slot');
 assert(app.includes('data-pennant-slot')&&app.includes('data-slot-delete'),'picker renders slot select + delete controls');
 assert(app.includes('slotListHTML()'),'picker renders the slot list');
 assert(app.includes("case'backup-export'")&&app.includes("k.startsWith('nightball.')"),'backup still exports every nightball.* key, slots included');
 assert(index.includes('./pennant.js?v=83'),'index pin for the changed pennant.js moves');
 assert(sw.includes('./pennant.js?v=83'),'SW precaches the new pennant.js');
 assert(index.includes('./style.css?v=74'),'index pin for the changed style.css moves');
 assert(sw.includes('./style.css?v=74'),'SW precaches the new style.css');
 assert(index.includes('./game.js?v=156')&&index.includes('./app.js?v=156'),'index pins move to v136');
 assert(sw.includes('nightball-v156-record-room'),'SW cache renamed for v136');
 assert(sw.includes('./game.js?v=156')&&sw.includes('./app.js?v=156'),'SW precaches the v136 scripts');
}
console.log('pennant-slots-v136: all assertions passed');
