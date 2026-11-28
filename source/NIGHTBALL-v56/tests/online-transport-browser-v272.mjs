// Real browser SCTP test. Run with Playwright and a Chromium installation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const code=readFileSync(new URL('../dist/online.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();
 await page.addScriptTag({content:code});
 const result=await page.evaluate(async()=>{
  const a=new RTCPeerConnection(),b=new RTCPeerConnection();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const wait=async(fn,timeout=7000)=>{const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw Error('timeout');await sleep(25);}};
  const toA=[],toB=[];
  a.onicecandidate=e=>{if(e.candidate){if(b.remoteDescription)b.addIceCandidate(e.candidate).catch(()=>{});else toB.push(e.candidate);}};
  b.onicecandidate=e=>{if(e.candidate){if(a.remoteDescription)a.addIceCandidate(e.candidate).catch(()=>{});else toA.push(e.candidate);}};
  const da=a.createDataChannel('reliable',{ordered:true});let db;
  b.ondatachannel=e=>{db=e.channel;};
  await a.setLocalDescription(await a.createOffer());await b.setRemoteDescription(a.localDescription);for(const c of toB)await b.addIceCandidate(c);
  await b.setLocalDescription(await b.createAnswer());await a.setRemoteDescription(b.localDescription);for(const c of toA)await a.addIceCandidate(c);
  await wait(()=>da.readyState==='open'&&db?.readyState==='open');
  const ra=[],rb=[],make=(pc,dc)=>({peerConnection:pc,dataChannel:dc,open:true,send:m=>dc.send(JSON.stringify(m)),on(){}});
  const sa=new NightOnline.Session({onData:m=>ra.push(m)},'host','ABC234'),sb=new NightOnline.Session({onData:m=>rb.push(m)},'guest','ABC234');
  sa.conn=make(a,da);sb.conn=make(b,db);sa.open=sb.open=true;
  sa.setupPose(sa.conn);sb.setupPose(sb.conn);await wait(()=>sa.poseOpen&&sb.poseOpen);
  const received=[];db.onmessage=e=>received.push(JSON.parse(e.data));
  for(let i=1;i<=12;i++)sa.sendPose({t:'pose',n:i,stamp:performance.now(),d:[i]});
  sa.send({t:'runner-commands',commands:[{id:'x',base:2}]});
  await wait(()=>received.length===1&&rb.length>0);
  const stats=await sa.sampleStats();
  const info={ordered:sa.pose.ordered,retries:sa.pose.maxRetransmits,received:rb.length,command:received[0],path:stats.path};
  sa.destroy();sb.destroy();a.close();b.close();return info;
 });
 assert.equal(result.ordered,false);assert.equal(result.retries,0);assert(result.received>0);assert.equal(result.command.t,'runner-commands');
 console.log('PASS native browser RTCDataChannel (separate reliable command and negotiated unreliable pose):',result);
}finally{await browser.close();}
