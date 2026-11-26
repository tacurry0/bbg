const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;const store=new Map();
global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
for(const f of ['ratings-data.js','players.js','pennant.js','npb-data.js','kbo-data.js','uniform-editor.js'])vm.runInThisContext(fs.readFileSync('dist/'+f,'utf8'),{filename:f});
const U=NightUniforms,clubs=[...NightTeams.all,...NightNPBData.teams,...NightKBOData.teams];
assert.equal(clubs.length,30);U.apply(clubs,{});
for(const club of clubs){
 assert(U.hasPreset(club.id));
 for(const side of ['home','away']){
  const k=U.kit(club,side);
  for(const field of U.COLORS)assert(U.valid(k[field]),club.id+' '+field);
  assert(k.capMark&&k.wordmark&&U.PATTERNS.includes(k.pattern));
 }
 assert.notDeepEqual(U.kit(club,'home'),U.kit(club,'away'));
}
const bro=clubs[0],factory=U.kit(bro,'home');
assert.equal(factory.shirt,'#f7c516','Brothers home must not be white');
assert.equal(U.kit(clubs.find(c=>c.id==='npb-t'),'home').pattern,'pinstripe');
U.apply(clubs,{owls:{color:'#112233',accent:'#123456',away:{shirt:'#abcdef',pattern:'pinstripe',helmet:'#445566'}}});
assert.equal(U.kit(bro,'home').cap,'#112233');
assert.equal(U.kit(bro,'away').shirt,'#abcdef');
assert.equal(U.kit(bro,'away').helmet,'#445566');
assert.equal(U.kit(bro,'home').shirt,factory.shirt);
assert.equal(U.resolvedKit(bro,'home',{...factory,shirt:'#334455'}).shirt,'#334455','wire overrides local appearance');
assert.equal(U.resolvedKit(bro,'home',{shirt:'red'}).shirt,factory.shirt,'invalid packets do not mutate data');
assert.deepEqual(U.cleanKit({foo:'bad',shirt:'blue',wordmark:'<hello>',pattern:'bad',frontNumber:true}),{wordmark:'hello',frontNumber:true});
U.save({owls:{color:'#112233',home:{shirt:'#abcdef'},away:{pattern:'panel',cap:'#778899'}}});
assert.deepEqual(U.load(),{owls:{color:'#112233',home:{shirt:'#abcdef'},away:{pattern:'panel',cap:'#778899'}}});
U.apply(clubs,{});assert.deepEqual(U.kit(bro,'home'),factory);
(async()=>{
 const T=await import('../dist/vendor/three.module.min.js');
 const {StadiumRenderer}=await import('../dist/stadium3d.js');
 const {decorateChibiPlayer}=await import('../dist/stadium-premium.js');
 const gradient={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>gradient,measureText:()=>({width:100})},{get:(o,k)=>o[k]||(()=>{})});
 global.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 const r=Object.create(StadiumRenderer.prototype);r.scene=new T.Scene();r.materials=new Map();r.gl={isSoftwareRenderer:false};
 r.geometries={sphere:new T.SphereGeometry(1,16,12),lowSphere:new T.SphereGeometry(1,10,7),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12)};
 for(const role of ['pitcher','fielder','batter','runner','catcher']){
  const p=r.makePlayer(role,'home',18);decorateChibiPlayer(r,p);r.stylePlayer(p,'home',18,bro);
  const cap=['pitcher','fielder'].includes(role);
  assert(p.head.getObjectByName(cap?'cloth-cap':'batting-helmet'));
  assert.equal(p.head.children.filter(m=>m.material===r.materials.get('hair')&&m.isMesh).length,0,'no detached rear hair patches');
  assert(!r.materials.has('hair'),'rear hair material is not allocated');
  assert.equal(!!p.head.getObjectByName('helmet-ear-cover'),['batter','runner'].includes(role));
  assert.equal(p.capMat.clearcoat,cap?0:.72);
  assert.equal(p.torsoMat.map.image.width,512);
  assert.equal(p.pantsMat.color.getHexString(),factory.pants.slice(1));
  const texture=p.torsoMat.map;r.stylePlayer(p,'home',18,bro);assert.equal(p.torsoMat.map,texture);
  assert.equal(p.torsoMat.map,r.uniformTextures.get(p.uniformTextureKey).texture);
  r.stylePlayer(p,'away',42,bro,U.kit(bro,'away'));assert.equal(p.styleNo,42);
 }
 const app=fs.readFileSync('dist/app.js','utf8'),stage=fs.readFileSync('dist/stadium3d.js','utf8');
 for(const s of ['[amHost?\'host\':\'guest\']','game.uniformKits=uniforms','uniforms:{home:NightUniforms.snapshot','new UniformPreview','uniform-reset-side','uniformDraft[uniformSide]'])assert(app.includes(s),s);
 assert(stage.includes('g.uniformKits?.[atk]')&&stage.includes('g.uniformKits?.[def]'));
 console.log('PASS: 60 domestic kit presets, legacy and side edits, role headgear, texture reuse, real 3D materials, online wire and preview wiring');
})().catch(e=>{console.error(e);process.exitCode=1});
