const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const code=app.slice(app.indexOf('const DJ_POS='),app.indexOf('function speakPlay(data)'));
new Function(`
let now=0,screen='game',settings={stadiumDJ:true,sound:true,soundVolume:80},document={hidden:false},review={playback:false};
const performance={now:()=>now},$=()=>({hidden:true}),spoken=[];
const window={speechSynthesis:{getVoices:()=>[{name:'Samantha',lang:'en-US'},{name:'Daniel',lang:'en-GB'},{name:'Japanese',lang:'ja-JP'}],cancel(){},speak(u){spoken.push(u)}}};
class SpeechSynthesisUtterance{constructor(text){this.text=text;}}
`+code+`
const g={isFixture:true,phase:'aim',inning:1,half:'top',side:'away',outs:0,outsNeeded:3,battingIndex:{away:0},batter:{id:'x',name:'張仁瑋',no:28,pos:'RF'},box:{},substitutions:[],teams:{away:{},home:{}}};
djTick(g);if(spoken.length!==1||!spoken[0].text.includes('Number 28')||spoken[0].voice.name!=='Daniel')throw Error('PA introduction and male English voice');
djTick(g);if(spoken.length!==1)throw Error('duplicate plate');
if(djPlayer({name:'源田壮亮',englishName:'Sosuke Genda',no:6})!=='Number 6. Sosuke Genda')throw Error('English alias');
g.phase='change';spoken[0].onend();djTick(g);if(spoken.length!==1)throw Error('inning end must be silent');
g.phase='result';djResult(g,{en:'HOME RUN'});if(!spoken.at(-1).text.startsWith('Home run!'))throw Error('HR');
settings.stadiumDJ=false;djTick(g);if(djSpeaking())throw Error('OFF');
settings.stadiumDJ=true;g.phase='ended';djFinal(g);if(!spoken.at(-1).text.includes('ballgame'))throw Error('final');
`)();
assert(app.includes("stadiumDJ:true"));console.log('Stadium DJ checks passed');
