# NIGHTBALL audio (V14)

The bat and mitt effects use field recordings rather than the previous oscillator beeps. All seven recordings are CC0 1.0, verified on the original Freesound pages. Exact author, title, source URL, preview URL, processing and file hashes are in `dist/assets/audio/credits.json`; the same file is accessible from Settings → サウンド素材.

- Bat hits / glove catches: martinimeniscus (Florentine Films SFX, Freesound 162867, 162886, 164525, 164536).
- Baseball crowd ambience: eeease (354054).
- Crowd cheers: benfree (130568; audience recording, used for reactions).
- Swish: soundpost (173272).

`scripts/prepare-audio.py` downloads their publicly playable CC0 previews, removes leading silence from transients, high-pass filters, normalizes below full scale, and writes small mono MP3 files. The ambience is crossfaded into a loop. Raw cache files remain outside the repository. Rebuilding needs Python with numpy/scipy, ffmpeg, and network access.

`dist/audio.js` decodes the seven local files once after a user gesture. It mixes separate effects and crowd buses through a master gain and a compressor, bounds simultaneous voices, keeps the ambience loop from being evicted, and uses a longer reverb for the dome. Pausing or leaving stops the ambience; muting stops all sources and silences reverb. Effects volume and crowd level are stored in the existing local settings.

Game events now fire a single bat crack at contact, mitt pops on pitch reception / field catches / completed throws, and short dirt impacts on the first bounces. Hit result announcements trigger crowd reactions instead of a duplicate bat crack. The timing guide retains a quiet tactile-style click. No commentary voice or music is included.

Validation: `node tests/audio-v14.cjs`, existing pennant / season / runner checks, MP3 decode/peak checks, and browser AudioContext decode/output verification. Browser QA confirms audio output; physical smartphone speaker quality has not been assessed.

## NPB batting cheers (v223)

`dist/assets/audio/npb-taiko.mp3` is the user-supplied recording `taiko_20261126_215628.mp3` (2026-11-26), copied without modification. It is the default loop for NPB batting and scoring-position cheers in `dist/music.js`. The other league presets, custom assignments, and sound effects are unchanged.

## CTBC Brothers hit cheer (v230)

`dist/assets/audio/ctbc-brothers-hit.mp3` is the user-supplied recording `我們兄弟（安打）.mp3` (2026-11-26), copied unchanged. It is the default non-looping hit cue for CTBC Brothers (team ID `owls`), available in the song editor. Per-player and per-team custom settings, including explicit mute, retain priority. Other teams and result cues are unchanged.
