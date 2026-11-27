#!/usr/bin/env python3
"""Generate English male PA clips at build time; no phone TTS required."""
import io, json, shutil, subprocess, sys, wave
from pathlib import Path
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
engine = shutil.which("espeak-ng") or shutil.which("espeak")
if not engine:
    raise SystemExit("Install espeak-ng before building the stadium PA.")
phrases = {
    "welcome": "Ladies and gentlemen! Welcome to the ballpark. Here are your starting lineups!",
    "final": "That is the ballgame! Thank you for joining us, and have a great day!",
    "hr": "Home run!", "grand": "Grand slam!", "walkoff": "Walk-off home run!",
    "abs-stands": "After review, the call stands.",
    "abs-overturned": "After review, the call is overturned.",
    "pitching": "Now pitching!", "pinch": "Now entering as a pinch hitter!",
    "number": "Number",
}
order = ["Leading off", "Batting second", "Batting third", "Batting cleanup", "Batting fifth", "Batting sixth", "Batting seventh", "Batting eighth", "Batting ninth"]
positions = ["pitcher", "catcher", "first baseman", "second baseman", "third baseman", "shortstop", "left fielder", "center fielder", "right fielder", "designated hitter"]
phrases.update({f"order-{i}": t for i,t in enumerate(order,1)})
phrases.update({f"pos-{i}": t for i,t in enumerate(positions)})
phrases.update({f"num-{i}": str(i) for i in range(100)})
frames, clips = [], {}
rate, cursor = 22050, 0
for key, phrase in phrases.items():
    raw = subprocess.check_output([engine, "-v", "en-us+m3", "-s", "151", "-p", "38", "-a", "170", "--stdout", phrase])
    with wave.open(io.BytesIO(raw), "rb") as src:
        assert src.getnchannels() == 1 and src.getsampwidth() == 2 and src.getframerate() == rate
        data = src.readframes(src.getnframes())
    count = len(data)//2
    clips[key] = [round(cursor/rate,6), round(count/rate,6)]
    frames.extend([data,b"\0\0"*2205])
    cursor += count+2205
tmp = out / "dj-pa-v1.wav"
with wave.open(str(tmp), "wb") as dest:
    dest.setparams((1,2,rate,0,"NONE","not compressed"))
    dest.writeframes(b"".join(frames))
subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(tmp),"-codec:a","libmp3lame","-b:a","48k",str(out/"dj-pa-v1.mp3")],check=True)
tmp.unlink()
(out/"dj-pa-v1.json").write_text(json.dumps({"version":1,"clips":clips},separators=(",",":")),encoding="utf-8")
print(f"Generated {len(clips)} PA clips, {(out/'dj-pa-v1.mp3').stat().st_size:,} bytes")
