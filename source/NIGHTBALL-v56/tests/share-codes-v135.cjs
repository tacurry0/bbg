// v135 creation share codes (checker item "creation-share-codes"):
//  - a custom park and a custom league round-trip through a text code
//    into a fresh store with identical editor-owned data and a fresh id,
//  - importing a code whose name collides adds a suffixed copy and never
//    overwrites the existing entry,
//  - malformed codes, wrong-kind codes, unsupported versions, missing
//    required fields and editor-invalid league data are all rejected
//    with an error result (no throw, nothing stored),
//  - imported creations are actually usable: the park resolves through
//    NightPlayers.parks / wallDistance and the league through
//    NightPennant.clubsFor,
//  - app wiring + v135 pins.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','stadium-editor','pennant','npb-data','npb-rosters','kbo-data','kbo-rosters','league-editor','share-codes']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function memStorage(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};}
const b64url=obj=>Buffer.from(JSON.stringify(obj),'utf8').toString('base64url');
const CPBL4=['owls','foxes','falcons','mariners'];
const parkSpec={name:'共有ドーム',left:92,leftCenter:108,center:122,rightCenter:111,right:94,wallHeight:3.6};
const leagueDef={name:'共有リーグ',clubIds:CPBL4,gamesPerOpponent:3,dh:false,playoffs:true};

// ---------- park round trip ----------
{
 const storeA=memStorage(),storeB=memStorage();
 const saved=NightStadium.upsert(parkSpec,storeA);
 const code=NightShare.exportPark(saved.id,storeA);
 assert.match(code,/^NB1\.PARK\.[A-Za-z0-9_-]+$/,'park code carries the version + kind prefix');
 console.log(`park code length: ${code.length} chars`);
 const dec=NightShare.decode(code);
 assert.equal(dec.ok,true);assert.equal(dec.kind,'park');
 const result=NightShare.importCode(code,storeB);
 assert.equal(result.ok,true);assert.equal(result.kind,'park');assert.equal(result.renamed,false);
 assert.notEqual(result.item.id,saved.id,'the import mints a fresh local id');
 for(const f of ['name',...NightShare.PARK_FIELDS])assert.equal(result.item[f],saved[f],`park field ${f} survives the round trip`);
 const stored=NightStadium.loadSpecs(storeB);
 assert.equal(stored.length,1);assert.equal(stored[0].name,parkSpec.name);
 // Usable: registered as a selectable park and the geometry resolves.
 const park=NightPlayers.parks.find(p=>p.id===result.item.id);
 assert(park&&park.custom,'imported park is registered in NightPlayers.parks');
 assert.equal(NightPlayers.wallDistance(park,0),122,'imported park centre distance resolves');
 assert.equal(NightPlayers.fenceHeight(park,0),3.6,'imported park wall height resolves');
 NightStadium.remove(result.item.id,storeB);NightStadium.remove(saved.id,storeA);
}

// ---------- league round trip ----------
{
 const storeA=memStorage(),storeB=memStorage();
 const saved=NightLeague.upsert(leagueDef,storeA);
 assert(saved,'league saves in the source store');
 const code=NightShare.exportLeague(saved.id,storeA);
 assert.match(code,/^NB1\.LEAGUE\.[A-Za-z0-9_-]+$/,'league code carries the version + kind prefix');
 console.log(`league code length: ${code.length} chars`);
 const result=NightShare.importCode(code,storeB);
 assert.equal(result.ok,true);assert.equal(result.kind,'league');assert.equal(result.renamed,false);
 assert.notEqual(result.item.id,saved.id,'the import mints a fresh local id');
 assert.deepEqual(result.item.clubIds,CPBL4);
 assert.equal(result.item.gamesPerOpponent,3);assert.equal(result.item.dh,false);assert.equal(result.item.playoffs,true);
 // Usable: resolves through the pennant engine exactly like an editor-made league.
 assert.deepEqual(NightPennant.clubsFor(result.item.id).map(c=>c.id),CPBL4,'imported league resolves through clubsFor');
 const got=NightLeague.get(result.item.id,storeB);
 assert(got&&got.name===leagueDef.name,'imported league reads back through NightLeague.get');
 const p=new NightPennant(CPBL4[0],3,{customLeague:result.item});
 assert.equal(NightPennant.validSchedule(p.schedule,p.clubs,3),true,'imported league generates a valid schedule');
 NightLeague.remove(result.item.id,storeB);NightLeague.remove(saved.id,storeA);
}

// ---------- name collisions never overwrite ----------
{
 const store=memStorage();
 const first=NightShare.importCode(NightShare.encodePark(parkSpec),store);
 assert.equal(first.ok,true);
 const before=JSON.stringify(NightStadium.loadSpecs(store));
 const second=NightShare.importCode(NightShare.encodePark(parkSpec),store);
 assert.equal(second.ok,true);assert.equal(second.renamed,true);
 assert.equal(second.item.name,parkSpec.name+' (2)','the colliding import is suffixed, not merged');
 const specs=NightStadium.loadSpecs(store);
 assert.equal(specs.length,2,'both parks coexist');
 assert.equal(JSON.stringify([specs.find(s=>s.id===first.item.id)]),JSON.stringify([JSON.parse(before)[0]]),'the original park is untouched');
 const l1=NightShare.importCode(NightShare.encodeLeague(leagueDef),store);
 const l2=NightShare.importCode(NightShare.encodeLeague(leagueDef),store);
 assert.equal(l1.ok,true);assert.equal(l2.ok,true);assert.equal(l2.renamed,true);
 assert.equal(l2.item.name,leagueDef.name+' (2)');
 assert.equal(NightLeague.loadDefs(store).length,2,'both leagues coexist');
 assert.equal(NightLeague.get(l1.item.id,store).name,leagueDef.name,'the original league keeps its name');
 for(const s of NightStadium.loadSpecs(store))NightStadium.remove(s.id,store);
 for(const d of NightLeague.loadDefs(store))NightLeague.remove(d.id,store);
}

// ---------- same-millisecond export/import still mints distinct ids ----------
// The editors' fallback ids are Date.now()+store-length based, so with
// the clock frozen an export and an import into an empty store would
// mint the same id and upsert-by-id would replace the original entry.
// Imports carry an explicit random id, so the ids must differ even here.
{
 const realNow=Date.now;Date.now=()=>1700000000000;
 try{
  const storeA=memStorage(),storeB=memStorage();
  const savedP=NightStadium.upsert(parkSpec,storeA);
  const impP=NightShare.importCode(NightShare.exportPark(savedP.id,storeA),storeB);
  assert.equal(impP.ok,true);assert.notEqual(impP.item.id,savedP.id,'park import id differs even in the same millisecond');
  const savedL=NightLeague.upsert(leagueDef,storeA);
  const impL=NightShare.importCode(NightShare.exportLeague(savedL.id,storeA),storeB);
  assert.equal(impL.ok,true);assert.notEqual(impL.item.id,savedL.id,'league import id differs even in the same millisecond');
  NightStadium.remove(impP.item.id,storeB);NightStadium.remove(savedP.id,storeA);
  NightLeague.remove(impL.item.id,storeB);NightLeague.remove(savedL.id,storeA);
 }finally{Date.now=realNow;}
}

// ---------- rejection paths: no throw, nothing stored ----------
{
 const store=memStorage();
 const bad=['',null,undefined,'hello','NB1.PARK.','NB1.PARK.!!!','NB1.XXX.aaaa','NB2.PARK.'+b64url({v:2,kind:'park',data:parkSpec}),
  'NB1.PARK.'+b64url({v:2,kind:'park',data:parkSpec}), // payload version disagrees
  'NB1.PARK.'+b64url({v:1,kind:'league',data:leagueDef}), // payload kind disagrees with the tag
  'NB1.PARK.'+b64url({v:1,kind:'park',data:{name:'欠落球場'}}), // required dimensions missing
  'NB1.PARK.'+b64url({v:1,kind:'park',data:{...parkSpec,name:'  '}}), // blank name
  'NB1.LEAGUE.'+b64url({v:1,kind:'league',data:{...leagueDef,clubIds:[...CPBL4,'wolves']}}), // odd club count: editor validation rejects
  'NB1.LEAGUE.'+b64url({v:1,kind:'league',data:{...leagueDef,clubIds:['owls','foxes','falcons','nope']}}), // unknown club
  'NB1.LEAGUE.'+b64url({v:1,kind:'league',data:{name:'x'}}), // required fields missing
 ];
 for(const code of bad){
  const r=NightShare.importCode(code,store);
  assert.equal(r.ok,false,`code is rejected: ${String(code).slice(0,40)}`);
  assert.equal(typeof r.error,'string');
 }
 assert.equal(NightStadium.loadSpecs(store).length,0,'no park was stored from bad codes');
 assert.equal(NightLeague.loadDefs(store).length,0,'no league was stored from bad codes');
 // Wrong-kind paste is rejected when the caller names the expected kind.
 const parkCode=NightShare.encodePark(parkSpec);
 assert.equal(NightShare.importCode(parkCode,store,'league').ok,false,'a park code is rejected by the league import');
 assert.equal(NightShare.importCode(NightShare.encodeLeague(leagueDef),store,'park').ok,false,'a league code is rejected by the park import');
 assert.equal(NightStadium.loadSpecs(store).length,0);assert.equal(NightLeague.loadDefs(store).length,0);
 // A tampered payload (valid base64, edited value) still goes through the
 // editor clamp on import: out-of-range dimensions cannot sneak in.
 const tampered='NB1.PARK.'+b64url({v:1,kind:'park',data:{...parkSpec,center:999,wallHeight:99}});
 const t=NightShare.importCode(tampered,store);
 assert.equal(t.ok,true);assert.equal(t.item.center,160,'out-of-range centre clamps to the editor ceiling');
 assert.equal(t.item.wallHeight,12,'out-of-range wall height clamps too');
 NightStadium.remove(t.item.id,store);
}

// ---------- app wiring + v135 pins ----------
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
 assert(app.includes("case'stadium-share'")&&app.includes("case'stadium-share-import'"),'stadium editor wires share export/import');
 assert(app.includes("case'league-share-export'")&&app.includes("case'league-share-import'"),'league editor wires share export/import');
 assert(app.includes('id="share-park-code"')&&app.includes('id="share-league-code"'),'both editors render a share-code field');
 assert(index.includes('./share-codes.js?v=1'),'index loads share-codes');
 assert(sw.includes('./share-codes.js?v=1'),'SW precaches share-codes');
 assert(index.includes('./game.js?v=139')&&index.includes('./app.js?v=139'),'index pins move to v135');
 assert(sw.includes('nightball-v139-draft'),'SW cache renamed for v135');
 assert(sw.includes('./game.js?v=139')&&sw.includes('./app.js?v=139'),'SW precaches the v135 scripts');
}
console.log('share-codes-v135: all assertions passed');
