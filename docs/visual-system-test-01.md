# SGM Visual System Test 01

`SGM_Design_Direction_v0.2`を判断基準、`SGM_Visual_System_Study_v0.1`を仮値の主資料として、B案Bottom SheetでTypography 3案 × Visual System 3案を独立比較する実験です。現行Warm Utilityは`visual=baseline`として参照できますが、9通りの比較数には含めません。

## 実装監査

- Vite / React / TypeScript / MapLibre GL JS。地図、検索、建築データ、EN/JA、外部リンクは共通。
- Bottom Sheetはcompact 218px、expandedはviewport基準。選択建築と展開状態はReact state、地図位置とzoomはMapLibre state。
- ピンは同一GeoJSON sourceのcircle layer。Visual切替時はpaint propertyだけを更新し、地図を再生成しない。
- ベースマップは外部OpenFreeMap styleで、テーマ用の安定したsemantic APIを持たない。推測的なlayer上書きや色overlayは行わず、3案で固定する。

## URLパラメータ

- Typography: `font=a` Hanken Grotesk / `font=b` Atkinson Hyperlegible Next / `font=c` DM Sans + Newsreader
- Visual: `visual=cartographic` / `visual=editorial` / `visual=civic`
- Baseline: `visual=baseline`
- 共通構造: `ui=b`

9通りは上記の`font`と`visual`を組み合わせます。例: `en/?ui=b&font=a&visual=cartographic`。比較パネルは初期状態で折りたたまれ、`COMPARE`から開閉します。

## Visual token差分

| Role | Cartographic Clarity | Editorial Index | Civic Character |
|---|---|---|---|
| Sheet / text | `#FAFAF7` / `#24342E` | `#F8F6F0` / `#252B28` | `#F9F7F1` / `#26362F` |
| Accent | `#285C50` | `#4A5148` | `#245F77` |
| Pin default / selected | `#326B5D` / `#D26F40` | `#414A43` / `#A4513B` | `#286C84` / `#D98048` |
| Title | 22px / 1.25 / 600 | 23px / 1.22 / 600 | 22px / 1.27 / 600 |
| Sheet inline / section | 20px / 20px | 24px / 24px | 20px / 20px |
| Sheet / control radius | 16px / 10px | 8px / 4px | 18px / 12px |

色、type role、spacing、shapeはsemantic CSS variablesを同じcomponent treeへ適用します。Typography selectorはfont-familyだけ、Visual selectorはfont-family以外だけを変更します。

## 隔離

比較実験は`experiment/visual-system-test-01`、選定実装は`implementation/ta-c`へ隔離する。`main`へはまだマージしない。GitHub Pagesへの手動デプロイは、リポジトリの本番ブランチを変更せず実機確認するために使用する。

## 現時点の選定実装

2026-10-23時点の選定はTypography A（Hanken Grotesk）× Visual System C（Civic Character）。英語版で`font`または`visual`を指定しない場合の標準表示をTA × Cとする。比較UI、9通りの直接URL、Warm Utility baselineは引き続き利用できる。Visual B（Editorial Index）の落ち着いた構成は次回以降の調整時の参照として残す。
