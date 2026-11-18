#!/usr/bin/env python3
"""Join sourced matchup/position evidence onto both CPBL and APBC identities."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
evidence=json.loads((R/'data/player-matchup-evidence-2026.json').read_text())
body=json.dumps(evidence,ensure_ascii=False,separators=(',',':'))
(R/'dist/matchup-data.js').write_text('/* Public 2026 splits; unknown fields stay null. Run scripts/build-matchups.py. */\nwindow.NightMatchupEvidence='+body+';\n'+'''(()=>{
 const normalize=s=>String(s||'').replace(/[\\s　]/g,'');
 const byName=new Map(Object.entries(NightMatchupEvidence.players).flatMap(([key,p])=>[[normalize(key),p],[normalize(p.name),p]]));
 const players=NightTeams.playable.flatMap(c=>[...c.batters,...c.pitchers]);
 for(const p of players){const ev=byName.get(normalize(p.nativeName))||byName.get(normalize(p.name));if(!ev)continue;
  p.matchupEvidence=ev.matchupEvidence||null;p.positionEvidence=ev.positionEvidence||null;p.pitchEvidence=ev.pitchEvidence||null;
  const appearances=ev.positionEvidence?.appearances;
  if(Array.isArray(appearances)){const valid=new Set(['C','1B','2B','3B','SS','LF','CF','RF','DH']);const known=appearances.filter(x=>x.games>0&&valid.has(x.pos)).map(x=>x.pos);if(known.length)p.positions=[...new Set([p.pos,...known])];}
 }
})();\n''')
print('Matchup evidence:',len(evidence['players']),'identities')
