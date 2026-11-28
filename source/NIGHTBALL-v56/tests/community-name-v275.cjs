const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../dist/online-community.js','utf8');
const key='nightball.community.v1',id='0123456789abcdef0123';
function boot(seed){
 const store=new Map(seed?[[key,JSON.stringify(seed)]]:[]);
 let networkStarts=0;
 const ctx=vm.createContext({localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},NightOnline:{loadPeer(){networkStarts++;return new Promise(()=>{});}},setTimeout,clearTimeout,console});
 vm.runInContext(src,ctx);return {C:ctx.NightCommunity,store,networkStarts:()=>networkStarts};
}
const fresh=boot();
assert.equal(fresh.C.hasName(),false);
fresh.C.start();assert.equal(fresh.networkStarts(),0,'no network before nickname registration');
for(const n of ['', '  ', 'x'.repeat(25), 'a\nb', null])assert.equal(fresh.C.setName(n),false);
const originalId=fresh.C.profile().id;
assert(fresh.C.setName('  初回の名前  '));assert(fresh.C.hasName());assert.equal(fresh.C.profile().name,'初回の名前');
assert.equal(fresh.C.profile().id,originalId);
fresh.C.start();assert.equal(fresh.networkStarts(),1);
const saved=JSON.parse(fresh.store.get(key));assert(saved.nameSet);
const reload=boot(saved);assert(reload.C.hasName());assert.equal(reload.C.profile().name,'初回の名前');

const legacy={id,name:'Player-'+id.slice(-5),rating:1532,games:4,w:3,l:1,d:0,streak:2,friends:[{id:'f'.repeat(20),name:'Friend'}],seen:['e'.repeat(20)],pending:[]};
const old=boot(legacy);assert(!old.C.hasName(),'automatic v274 name requires initial registration');
assert(old.C.setName('Renamed'));
const migrated=JSON.parse(old.store.get(key));
assert.equal(migrated.id,id);assert.equal(migrated.rating,1532);assert.equal(migrated.games,4);assert.deepEqual(migrated.friends,legacy.friends);assert.deepEqual(migrated.seen,legacy.seen);
const custom=boot({...legacy,name:'Existing'});assert(custom.C.hasName(),'custom v274 name is preserved');
assert.equal(custom.C.profile().name,'Existing');
assert(custom.C.setName('Player-'+id.slice(-5)));assert(boot(JSON.parse(custom.store.get(key))).C.hasName(),'manually registered default-shaped name stays registered');
console.log('PASS v275 nickname registration, validation, migration, identity preservation, and pre-registration network gate');
