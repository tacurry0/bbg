# Performance-derived abilities: stats2026-v1

The 72 selected players retain their real identities and stable save IDs. Game ratings are an original conversion of published performance, not official 全民打棒球 Pro card ratings or a claim that baseball ability can be measured exactly by a 0–100 number.

## Data and period

- All 54 hitters and 18 pitchers match by exact club and name against the six LiveTrend pages: https://bbm3.joybomb.tw/LiveTrend/trends?t=b (中信), t=w (味全), t=u (統一), t=f (富邦), t=r (樂天), t=t (台鋼).
- The page explicitly reports **2026-03-28 through 2026-10-06**. Retrieved **2026-11-04**. The numeric cells use current totals, excluding adjacent ▲/▼ changes. The frozen raw source is `data/live-trends-2026-10-06.json`.
- Published CPBL tracking samples supply fastball average/maximum speeds for 16 pitchers. These are the samples displayed on their profiles, which can include a second-team setting; they must not be described as a complete first-team season average. Pitch counts are exposed in the player details. For example, 曾家輝 has only 9 tracked fastballs in the displayed sample.
- Two profiles have no available tracking sample: 林子崴 uses a 2026 analysis reporting 144.5 km/h average, 149 maximum, slider 131.6 and changeup 133.2; 江承諺 uses a 2026 report of a 135 km/h average. His maximum remains unknown and is not shown as a measured value.
- `data/pitching-scouting-2026.json` retains a source per pitcher for the reported repertoire. Some supporting repertoire reports predate 2026. They identify known pitch types; they do not establish exact current usage percentages.
- `data/defense-evidence-2026.json` records published 2026 Gold Glove results and a few defensive outcomes. These awards were announced after the LiveTrend statistical period and are separately identified in player details.

## Reproducible conversion

Run `python scripts/build-ratings.py` to regenerate `dist/ratings-data.js` from the frozen source records, identity selection and scouting evidence. No network request occurs while playing. No arbitrary club strength modifier is applied to a player's ability.

League baselines are weighted by opportunities across all six teams. Percentile reference populations are hitters with at least 100 PA (90 players in this snapshot) and pitchers with at least 20 IP (101 players). Ratings are bounded between 35 and 98. Tied values use their shared midpoint percentile.

### Batters

Rate estimates are shrunk toward the league baseline before percentile comparison:

- Batting average: `(H + 120 * league AVG) / (AB + 120)`.
- Strikeout rate: `(SO + 100 * league K/PA) / (PA + 100)`.
- ISO: `((TB-H) + 100 * league ISO) / (AB + 100)`.
- HR rate: `(HR + 100 * league HR/AB) / (AB + 100)`.
- Stolen-base attempt rate: `((SB+CS) + 80 * league attempt/PA) / (PA + 80)`.
- Triple rate: `(3B + 150 * league 3B/AB) / (AB + 150)`.

Using PR in [0,1]:

| Game ability | Conversion |
| --- | --- |
| Contact | `40 + 55*(0.72*PR(AVG) + 0.28*PR(low K rate))` |
| Power | `35 + 220*adjusted ISO + 650*adjusted HR/AB` |
| Run | `38 + 60*(0.75*PR(SB attempt rate) + 0.25*PR(triple rate)) + 4*(smoothed SB success-.70)` |

Power uses absolute production anchors rather than only percentiles, so a moderate five-home-run season does not automatically become S power in a low-offense league. Run is a baserunning proxy, not measured sprint speed. A player with 20 PA is explicitly flagged as a small sample; a handful of hits cannot create a maximum rating. Traits follow the resulting profile, with no unsupported clutch bonus.

### Pitchers

The underlying K/9, BB/9, HR/9 and ERA estimates use 30 league-average prior innings. Innings fractions are parsed as outs: 99 2/3 is 99.666…, not 99.2.

| Game ability | Conversion |
| --- | --- |
| Control | `35 + 63*PR(low adjusted BB/9)` |
| Stamina | `26 + 9*(IP/G) + .05*IP`, bounded to 40–98 |
| Movement/quality | `40 + 57*(.60*PR(K/9) + .25*PR(low HR/9) + .15*PR(low ERA))` |
| Fastball | Published average sample speed; displayed maximum retained separately when known |

Mixed starter/reliever stamina uses IP per **appearance**, not IP per start, so relief innings do not falsely inflate endurance. Fastball variation is centered on the published average and capped by the known maximum. Individual pitch names, ratios, speeds and signature trajectories are used by both the pitch selector and the ball simulation; the UI no longer displays a speed from a separate generic formula.

Unmeasured pitch speeds use conservative type-dependent ratios to the published fastball speed. Exact game movement is an estimate informed by the repertoire and performance; it is not measured break in centimeters. Knuckle curve maps to the curve trajectory, sweeper to slider, and Vulcan/kick changeups to changeup with their proper personal labels. No player receives the old generic knuckleball simply because he occupies pitcher slot 2.

## Remaining estimates

Field and arm are clearly labeled estimates. They start from the player's defensive position (with natural-position overrides for designated hitters) and receive limited adjustments from confirmed defensive evidence. Gold Glove winners receive a strong field rating; available outfield assists and 宋嘉翔's published caught-stealing result can inform arm. Missing data is never silently presented as measured fielding range, throwing speed or catch probability.

Source links, real statistical lines, speed sample sizes, small-sample notes and these estimation limits are available from each player's ability panel. The saved-match loader refreshes the current player records, retaining batting order, score, base occupancy and box totals.

## Bench expansion (V15)
The roster is now16batters+14pitchers perclub. New ratings use the same stat conversion and priors. Primary identity evidence is tracked in data/roster-expansion-evidence-2026.json. Missing pitch repertoires/velocities are explicit game estimates. Player roles are stat-derived, not a claim about current coach deployment. Bench players inherit the outgoing player's batting slot and defensive position; playing outside their listed positions reduces game fielding/throwing ratings. Pitching workload is tracked per appearance; runs shown are runs during the appearance, not earned runs.
