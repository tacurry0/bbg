const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../dist'),dir=path.join(root,'assets/menu/motion-v277');
const names=['hero','match','season','online','career'];
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(html.includes('home-motion.js?v=278')&&sw.includes('home-motion.js?v=278'));
let bytes=0;
for(const key of names){
 const file=path.join(dir,key+'.mp4'),gif=fs.readFileSync(path.join(dir,key+'-animated.webp'));
 assert(html.includes('data-home-clip="'+key+'"'));
 assert(gif.includes(Buffer.from('ANIM'))&&gif.includes(Buffer.from('ANMF')),'animated fallback '+key);
 for(const ext of ['.mp4','.webp','-animated.webp'])assert(sw.includes('motion-v277/'+key+ext));
 bytes+=fs.statSync(file).size;
 const data=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,nb_frames,width,height,r_frame_rate','-of','json',file],{encoding:'utf8'})).streams[0];
 assert.equal(data.codec_name,'h264');assert(Number(data.nb_frames)>40);assert(data.width<=640&&data.height<=240);assert.equal(data.r_frame_rate,'16/1');
 // Distinct decoded frames are required: a static still in a video fails.
 const hashes=cp.execFileSync('ffmpeg',['-v','error','-threads','1','-i',file,'-an','-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(x=>x&&!x.startsWith('#')).map(x=>x.split(',').at(-1).trim());
 assert(new Set(hashes).size>=35,'real animated frames '+key);
}
assert(bytes<450000,'five primary clips should be lightweight');
console.log('PASS v277: actual decoded motion frames, animated fallbacks, cache inclusion, '+bytes+' primary bytes');
