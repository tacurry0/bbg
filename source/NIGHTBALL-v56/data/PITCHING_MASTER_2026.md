# 2026 pitching master — collection, not gameplay ratings

Collected 2026-11-26. Sources are stored per observation. The appearance index is a collection target, not evidence that every pitch has been measured. It includes 335 NPB rows, 193 CPBL rows (through Oct 6), 200 KBO rows (Nov 19 official snapshot). A player who moved clubs may occur twice. Observations include 125 NPB, 533 CPBL, 69 KBO rows. See JSON coverage for name matches (conservative; aliases may not match).

- CPBL public archived leaderboard distinguishes first/farm and fastball/breakingball only. Never interpret aggregate breakingball as a slider, fork etc. Earlier scouting and new snapshot are kept separately rather than averaging incompatible samples.
- NPB public season starter and relief rankings supply straight-fastball data; prior supplement remains separate. NPB pitch-by-pitch archive is available for independent aggregation of all archived regular-season games, see collector script. No raw pitch-by-pitch redistributions.
- KBO official 2026 team season tables enumerate appearance targets. PTS ranking observations are partial; unmatched native names remain unlinked, and no missing maximum is invented.
- Unknown values stay null, and the existing game's estimates are not automatically promoted to actual data. No gameplay files changed in this collection commit.
