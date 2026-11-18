# APBC 2026 代表選考データ

正式登録選手のほか、実際の予備登録・集訓メンバーや年齢条件を満たす選手をゲーム内の候補に収録しています。現実の大会を辞退した選手も、ゲーム内で代表を編成する場合は選べます。追加選手の代表背番号はゲームで割り当てます。

| 代表 | 出典 |
|---|---|
| 日本 | 日刊スポーツの[選外選手一覧](https://www.nikkansports.com/baseball/news/202610070000689.html?mode=all)と、NPB公式の2026年個人成績。前川右京と堀柊那は年齢条件を満たすゲーム独自候補。 |
| 韓国 | [KBOの予備登録・辞退報道](https://www.koreabaseball.com/MediaNews/News/KboPhoto/View.aspx?bdSe=558121)と、KBO公式の2026年個人成績。パク・ジュンスンとハン・テヤンは年齢条件を満たすゲーム独自候補。大会背番号は[侍ジャパン公式の韓国代表一覧](https://www.japan-baseball.jp/jp/games/apbc2026/player_kor.html)。 |
| チャイニーズタイペイ | [集訓時の入れ替え](https://www.cna.com.tw/news/aspt/202611010083.aspx)と[最終28人](https://www.japan-baseball.jp/jp/games/apbc2026/player_tpe.html)を確認。林詔恩と孔念恩の能力は既存CPBL査定を使用。集訓後に外れた5人は候補として保持。 |

追加候補の元データは [data/apbc-selection-2026.json](data/apbc-selection-2026.json) に記録しています。日本と韓国の能力は、既存APBC選手と同じ統計モデルで2026年の公式戦成績を換算しました。守備・肩、投球の変化量、未確認の球種・球速は推定です。

データを再生成するにはリポジトリ直下で `python3 scripts/build-apbc-selection.py` を実行します。

### Expanded Chinese Taipei selection

The game adds the Taiwanese players already in its six CPBL club rosters. Official APBC and reserve entries retain their IDs and take precedence where a player also appears in the CPBL data. The club filter covers the six clubs and overseas-based representatives. Existing CPBL attributes are reused for additional players. The game allows veteran selection and assigns unused representative jersey numbers to club additions. Overseas recruits are excluded from the club additions, including players granted exceptions to the CPBL import quota. The game does not simulate official APBC eligibility for the expanded list.

- [2026 CPBL import registrations](https://tsna.com/article/202089)
- [Wei Chuan roster and Woodall quota status](https://www.cna.com.tw/news/aspt/202601160110.aspx)
- [Takashio and the CPBL draft exception](https://www.cna.com.tw/news/aspt/202407100320.aspx)
- [Rakuten's Marman announcement](https://monkeys.rakuten.com.tw/news_detail/895)
