"""Download verified CC0 Freesound previews and prepare small offline game samples.
Requires ffmpeg, numpy and scipy. Source/credit metadata is shipped with the game.
"""
from pathlib import Path
import concurrent.futures, hashlib, json, re, subprocess, urllib.request
import numpy as np
from scipy.signal import butter, sosfilt
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/audio'
CACHE=Path('/workspace/scratch/nightball-audio-raw')
OUT.mkdir(parents=True,exist_ok=True); CACHE.mkdir(parents=True,exist_ok=True)
SOURCES=[
 ('bat-1','martinimeniscus',162867,'Bat Hit 4 FF100.aif',.58),
 ('bat-2','martinimeniscus',162886,'Bat Hit 9 FF095.aif',.64),
 ('mitt-1','martinimeniscus',164525,'Glove Catch 10 FF005.aif',.43),
 ('mitt-2','martinimeniscus',164536,'Glove Catch 12 FF003.aif',.43),
 ('crowd-bed','eeease',354054,'Crowd2.wav',16),
 ('crowd-cheer','benfree',130568,'RoaringCrowd.wav',9),
 ('swish','soundpost',173272,'Swish.aif',.38),
]
def prepare(spec):
 name,author,sound_id,title,maximum=spec
 page=f'https://freesound.org/people/{author}/sounds/{sound_id}/'
 metadata=CACHE/f'{sound_id}.html'; raw=CACHE/f'{sound_id}.mp3'
 if not metadata.exists():metadata.write_bytes(urllib.request.urlopen(page,timeout=25).read())
 html=metadata.read_text()
 if 'creativecommons.org/publicdomain/zero' not in html:raise ValueError(f'CC0 license not confirmed: {page}')
 url=re.search(r'https://cdn\.freesound\.org/previews/[^\s"<>]+-hq\.mp3',html).group(0)
 if not raw.exists():raw.write_bytes(urllib.request.urlopen(url,timeout=25).read())
 decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(raw),'-f','f32le','-ac','1','-ar','44100','pipe:1'])
 y=np.frombuffer(decoded,dtype='<f4').copy(); sr=44100
 y=sosfilt(butter(2,90 if name.startswith('crowd') else 65,fs=sr,btype='highpass',output='sos'),y)
 if name.startswith('crowd'):
  y=sosfilt(butter(2,4300 if name=='crowd-bed' else 6500,fs=sr,output='sos'),y)
  start=2 if name=='crowd-bed' else 1
  y=y[int(start*sr):int((start+maximum)*sr)]
  if name=='crowd-bed':
   n=sr; mix=np.linspace(0,1,n); y=np.concatenate([y[n:-n],y[-n:]*(1-mix)+y[:n]*mix])
  else:
   n=int(.5*sr); y[:n]*=np.linspace(0,1,n);y[-2*sr:]*=np.linspace(1,0,2*sr)
 else:
  # Keep a few milliseconds before the first transient, not the leading room silence.
  env=np.convolve(y*y,np.ones(220)/220,'same')
  threshold=env.max()*.05
  start=max(0,int(np.flatnonzero(env>threshold)[0])-int(.008*sr))
  y=y[start:start+int(maximum*sr)]
  fade=min(int(.04*sr),len(y)//4);y[-fade:]*=np.linspace(1,0,fade);y[:22]*=np.linspace(0,1,22)
 peak=np.abs(y).max(); y*=.85/max(peak,1e-6)
 # Float -> portable MP3. No runtime dependency on the source site.
 dest=OUT/f'{name}.mp3'
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(sr),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','96k' if name.startswith('crowd') else '128k',str(dest)],input=y.astype('<f4').tobytes(),check=True)
 return dict(file=dest.name,title=title,author=author,source=page,preview=url,license='CC0 1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',changes='Trimmed, filtered, normalized, mono MP3; crowd bed crossfaded for looping.',seconds=round(len(y)/sr,3),sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:credits=list(pool.map(prepare,SOURCES))
(OUT/'credits.json').write_text(json.dumps(dict(prepared='2026-11-05',sounds=credits),ensure_ascii=False,indent=2)+'\n')
for row in credits:print(row['file'],row['seconds'],'seconds')
