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

初期値は `Square / Neutral / Light / Minimal / Flat / Compact` です。装飾を抑えた基準状態から、一度にひとつの方向性を加えて差を読み取れるようにしています。

## 比較方法

英語版の画面右側にある `SYSTEM LAB` を開き、各行の二択を変更します。選択はURLへ即時反映されるため、任意の組み合わせをブックマーク・共有できます。一つの軸を変更しても、ほかの5軸、地図中心・ズーム、選択中の建築、Bottom Sheetの展開状態は変更しません。

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
