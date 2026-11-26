const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'));const G=NightGame;
assert(G.cpuPitchWeight('fork',{strikes:2,recent:[{id:'fast'}]})>G.cpuPitchWeight('fork',{strikes:0}));
assert(G.cpuPitchWeight('fast',{balls:3})>G.cpuPitchWeight('fast',{balls:0}));
assert(G.cpuPitchWeight('fast',{recent:[{id:'fast'},{id:'fast'}]})<G.cpuPitchWeight('fast',{}));
assert(G.cpuSwingOdds({strikes:2,isStrike:true})>G.cpuSwingOdds({strikes:0,isStrike:true}));
assert(G.cpuSwingOdds({isStrike:false,edge:1.65})<G.cpuSwingOdds({isStrike:false,edge:1.1}));
assert(G.cpuSwingOdds({isStrike:false,edge:1.1,walk:.18})<G.cpuSwingOdds({isStrike:false,edge:1.1,walk:.04}));
assert(G.cpuSwingOdds({balls:3,strikes:0,isStrike:true})<G.cpuSwingOdds({balls:0,strikes:0,isStrike:true}));
assert.equal(G.cpuDiscipline({}).walk,.085);
for(let balls=0;balls<4;balls++)for(let strikes=0;strikes<3;strikes++)for(const edge of [0,.8,1.06,1.2,2])for(const walk of [.025,.085,.22]){const p=G.cpuSwingOdds({balls,strikes,edge,isStrike:edge<=1.06,walk});assert(p>0&&p<1);}
console.log('v204 CPU tactics passed');
