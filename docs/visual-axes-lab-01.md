# Visual Axes Lab 01

S1〜S3のような完成案を切り替えるのではなく、Visual Systemを6つの独立した二択へ分解して比較する実験です。B案Bottom Sheet、建築データ、検索、現在地、英日表示は共通です。

## 比較軸

| 軸 | 選択肢 | URLパラメータ |
| --- | --- | --- |
| UI shape | Square / Round | `shape=square` / `shape=round` |
| Map color | Neutral / Colored | `mapColor=neutral` / `mapColor=colored` |
| Typography | Light / Bold | `weight=light` / `weight=bold` |
| Map pin | Minimal / Symbolic | `pin=minimal` / `pin=symbolic` |
| Surface | Flat / Layered | `surface=flat` / `surface=layered` |
| Spacing | Compact / Spacious | `spacing=compact` / `spacing=spacious` |

初期値は現在の比較状態を基準へ昇格し、`Archive / Plot / Colored / UI B / Square / Light / Minimal / Flat / Compact` としています。これは最終決定ではなく、URL指定なしで繰り返し評価するための暫定基準です。

## System Study 02（2026-10-24）

既存6軸を残し、今回の検討対象を同じ `SYSTEM LAB` に追加した。独立ページや別データは作らず、選択建築、地図位置、UI A/B、英日状態を維持したまま切り替える。

| 軸 | 選択肢 | URLパラメータ |
| --- | --- | --- |
| Color System | Civic / Graphic / Archive | `color=civic` / `graphic` / `archive` |
| Identity | Plot / Frame / Link | `identity=plot` / `frame` / `link` |
| Map Mode | Color / Mono / Aerial | `mapMode=colored` / `mono` / `satellite` |

- Color Systemは、背景色だけでなく `paper / strong paper / ink / muted / line / accent / soft field / focus` の役割を一組で比較する。Civicは温かな紙とblue-green、Graphicは白と強い黒にcobalt、Archiveはgray-greenとmossを組み合わせる。
- Identityは左上から説明テキストを外し、地図の基準点・フレーム・接続を抽象化した単色記号だけにした。文字ロゴやピン形状と競争させず、ホーム／全体表示へ戻る操作は共通。
- Map Modeは同じMapLibre instanceでColored、POIを抑えたMono、Esri World ImageryのAerialを比較する。Aerialでは最小ピンを白、選択をcoralとして背景写真から分離する。
- UI Aは狭幅で詳細を下部62%の固定領域にし、上部38%に地図を残す。UI Bの伸縮シートとは、見た目だけでなく「地図と詳細を明確に分ける／連続的に重ねる」という操作モデルの差として比較する。
- アイコンは現行の24px線画セットを維持し、Phosphor Iconsのように線幅・端部・viewBoxを一貫させる考え方を参照した。依存追加やアイコン単体の個性化は行わない。
- 2026-10-24の画面調整では、上部のUI切替と言語切替を一つのFlatな操作帯へ統合し、検索・現在地・折りたたみ時の比較パネルから影と大きな丸みを除いた。Square + FlatのBottom Sheetは画面下端へ接続し、建築種別とレコード番号を同じメタ行へ整理した。通常ピンは縮小し、選択ピンだけが明確に立つようにした。

## 比較方法

英語版の画面右側にある `SYSTEM LAB` を開き、各行の選択肢を変更します。選択はURLへ即時反映されるため、任意の組み合わせをブックマーク・共有できます。一つの軸を変更しても、ほかの軸、地図中心・ズーム、選択中の建築、Bottom Sheetの展開状態は変更しません。

直接表示の例:

```text
/en/?ui=b&shape=square&mapColor=neutral&weight=light&pin=minimal&surface=flat&spacing=compact
/en/?ui=b&shape=round&mapColor=colored&weight=bold&pin=symbolic&surface=layered&spacing=spacious
```

言語切替では6軸の値、選択中の建築、シート状態を `/en/` と `/ja/` の間で引き継ぎます。実験セレクターは英語版だけに表示し、日本語版にも選択済みのVisual Systemを適用します。

## 判断の観点

- 地図がUIより先に知覚されるか
- 未選択／選択済みのピンと地図ラベルを区別しやすいか
- 建築名、設計者、事実情報の順序が自然に読めるか
- 片手操作でBottom Sheetと比較パネルを扱えるか
- Round、Colored、Bold、Symbolic、Layeredを重ねても装飾過多にならないか
- CompactとSpaciousのどちらが情報量と閲覧テンポのバランスに合うか

数値や色は比較差を明確にするための仮値です。今回の目的は最終値の決定ではなく、採用する方向性を軸ごとに判断することです。
