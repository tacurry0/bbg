# NIGHTBALL 選手キャリア

2026年のゲーム内名簿を初期データに使い、2027年の高校入学から架空の野球史を進めます。従来キャリアのセーブは独立して保持します。キャリア内の編成・日程・契約は他モードのデータに影響しません。

| 対象 | 参考にした資料 |
| --- | --- |
| 日本の高校野球 | [日本高野連・全国選手権要項](https://www.jhbf.or.jp/sensyuken/2026/guidance/)、[秋季地区大会](https://www.jhbf.or.jp/topics/detail/621) |
| 台湾の高校野球 | [運動部・黒豹旗](https://www.sports.gov.tw/News_Content/309/23975)、[学生棒球運動聯盟・鋁棒組](https://www.ctsbf.edu.tw/goods-view.html?id=158)、[玉山盃日程](https://esuncup.tw/schedule/index.php?Y=2026) |
| 韓国の高校野球 | [大韓野球ソフトボール協会大会システム](https://result.sports.or.kr/BA/)、[仁上高校・大会日程](https://school.jbedu.kr/insang/M010414/) |
| NPB | [ドラフト選択手順](https://draft.npb.jp/draft/2026/schedule.html)、[FA](https://npb.jp/announcement/2019/fa_about.html)、[CS](https://npb.jp/games/2026/info_cs.html)、[日本シリーズ](https://npb.jp/nippons/2026/information.html) |
| CPBL | [リーグ規約](https://www.cpbl.com.tw/theme/client/download/%E8%81%AF%E7%9B%9F%E8%A6%8F%E7%AB%A0.pdf)、[新人選抜申請](https://record.cpbl.com.tw/CPBL_Register/SignUpDefault.aspx) |
| KBO | [新人ドラフト](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=12137)、[ポストシーズン](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=12183)、[FA承認](https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=12243) |

## ゲーム内の扱い

- 高校の学校名・地域内の対戦校は架空です。大会は代表的な開催時期と出場経路を採用し、学校数とラウンド数を短縮しています。台湾の木棒／鋁棒は学校の登録区分をゲーム内で設定し、玉山盃では縣市代表の選考を経ます。韓国の週末リーグ順位を一部全国大会の出場条件に使います。日本のセンバツでは秋季地区大会の成績を選考に使います。
- 標準日程の一軍試合数はNPB143、CPBL120、KBO144です。短縮日程はそれぞれ22、20、18試合です。雨天順延、年ごとの日程変更、実際の登録日数、順位決定戦、NPBファーム単独球団の運営は簡略化しています。二軍は所属球団の育成試合として扱います。
- ドラフトの全体演出は高校・アマチュアの候補と生成選手を使います。NPBの1位競合と抽選、全体の選択順、CPBLの前年度順位、KBOの逆順11巡をモデル化しています。NPBの再入札・育成ドラフト、指名権トレード、各国の登録・資格の細則は簡略化しています。
- 契約期間中の移籍は国内の交換トレードを扱います。契約満了時には更新、条件付きのFA、戦力外後の契約、ゲーム内ルートの球団合意移籍があります。外国人枠はリーグ別の簡略モデルで、枠の例外、補償、ポスティング、代理人交渉の実務までは扱いません。
- 実在選手は収録済み名簿の名前・背番号・能力を使用します。名簿にない年齢・国籍はシミュレーション用の推定です。実在選手に未確認の背番号は付与しません。
- 一軍成績は個々の打席や登板から集計します。二軍および学校対戦のタイブレーク、試合日・登板間隔、選手の出場日数はキャリア用に調整しています。フル試合では既存の交代画面で自チームの登録選手を起用できます。
- 代表は出身国で選考し、WBC・プレミア12・APBCの開催周期をゲーム年に割り当てます。各大会では日・台・韓の代表カードを収録しています。実際の参加国全体や国籍の例外資格は対象外です。
- アジアシリーズはNIGHTBALL独自の復活大会です。国内王者3球団の総当たりと決勝を実施します。歴代記録には大会結果・MVPを残します。
- シミュレーション中の長い日程進行は、ドラフト・契約・本人の代表戦・アジアシリーズで区切ります。保存サイズを抑えるため、新キャリアはブラウザ内の別キーに圧縮保存します。

## テスト

`node tests/career-world.cjs` で各国の進路、複数年の成績、移籍と復帰、国際大会、引退、セーブを検証します。スマートフォンの画面操作は `node tests/career-world-browser.mjs` で確認します。
