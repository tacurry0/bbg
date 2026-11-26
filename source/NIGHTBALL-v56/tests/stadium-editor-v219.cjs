const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','stadium-editor','share-codes','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const {DISTANCES,HEIGHTS,LIMITS}=NightStadium;
const spec=NightStadium.clampSpec({name:'九点テスト',detailShape:true,left:55,leftGap:145,leftCenter:68,leftDeep:180,center:200,rightDeep:80,rightCenter:150,rightGap:100,right:160,height0:.5,height1:25,height2:3,height3:10,height4:18,height5:2,height6:6,height7:8,height8:12,foulWidth:5,surface:'artificial',mow:'checker',turfColor:'#123456',trackWidth:8,venue:'retractable',roofOpen:'open',roofShape:'gable',windMode:'fixed',windSpeed:12,windDirection:90,weather:'rain',bounce:1.3,roll:1.4,wallRebound:.7,crowd:30,lightCount:8,boardPosition:'right',adText:'TEST'});
const p=NightStadium.makePark(spec,'custom-test');
for(let i=0;i<9;i++){const a=-Math.PI/4+i*Math.PI/16;assert(Math.abs(NightPlayers.wallDistance(p,a)-spec[DISTANCES[i]])<1e-7);assert(Math.abs(NightPlayers.fenceHeight(p,a)-spec[HEIGHTS[i]])<1e-7);}
for(let i=0;i<=1000;i++){let a=-Math.PI/4+i*Math.PI/2000,r=NightPlayers.wallDistance(p,a);assert(r>=55&&r<=200);}
assert.equal(NightPlayers.insideFoul(p,20,10),false);assert.equal(NightPlayers.insideFoul({...p,foulWidth:35},20,10),true);
const legacy={name:'Old',left:95,leftCenter:106,center:118,rightCenter:110,right:98,wallHeight:4};
const legacyPark=NightStadium.makePark(legacy,'custom-old');assert.equal(legacyPark.fenceAnchors,null);
for(let i=0;i<100;i++){let a=-Math.PI/4+i*Math.PI/200;assert.equal(NightPlayers.wallDistance(legacyPark,a),NightPlayers.wallDistance(legacy,a));assert.equal(NightPlayers.fenceHeight(legacyPark,a),4);}
const a=mem(),b=mem(),saved=NightStadium.upsert(spec,a),coded=NightShare.exportPark(saved.id,a),imported=NightShare.importCode(coded,b);
assert(imported.ok);assert.notEqual(imported.item.id,saved.id);assert.deepEqual(imported.item.customSpec,spec);
const old=NightShare.importCode(NightShare.encode('park',legacy),b);assert(old.ok);assert.equal(old.item.fenceAnchors,null);
const clean=NightStadium.clampSpec({left:1,height0:1000,windSpeed:-99,surface:'unknown',turfColor:'<bad>',lightCount:7,crowd:900});
assert.deepEqual([clean.left,clean.height0,clean.windSpeed,clean.surface,clean.turfColor,clean.lightCount,clean.crowd],[55,25,0,'grass','#5d8a4a',8,100]);
const forecast=NightGame.rollForecast(p,()=>.2);assert.equal(forecast.weather,'rain');assert.equal(forecast.wind,12);assert.equal(forecast.windDirection,90);
const closed=NightStadium.makePark({...spec,roofOpen:'closed'},'custom-closed');assert.equal(closed.theme,'dome');assert.equal(NightGame.rollForecast(closed).wind,0);assert.equal(NightGame.rollForecast(closed).weather,'clear');
const game=new NightGame('match','standard',()=>{},{parkDefinition:p,park:p.id,manualRunning:false});assert.equal(game.park,p);assert.equal(game.weather,'rain');assert.equal(game.windVector().x,12);assert(Math.abs(game.windVector().y+1.2)<1e-9);
assert(!NightPlayers.parks.some(x=>x.id===p.id),'remote park definition does not persist');
const calm=new NightGame('match','standard',()=>{},{parkDefinition:NightStadium.makePark({...spec,weather:'clear',windSpeed:0},'calm')});
const windy=new NightGame('match','standard',()=>{},{parkDefinition:NightStadium.makePark({...spec,weather:'clear'},'windy')});
const ball={x:0,y:0,z:1,vx:0,vy:40,vz:25,bounces:0};assert(windy.predictLanding(ball).x>calm.predictLanding(ball).x+4,'crosswind genuinely affects the trajectory');
assert.equal(NightStadium.fromPark(saved).adText,'TEST');
for(const k of Object.keys(LIMITS))assert(Number.isFinite(spec[k]),k);
console.log('PASS: nine-point geometry, legacy shape, share, clamp, indoor environment, crosswind, remote park isolation');
