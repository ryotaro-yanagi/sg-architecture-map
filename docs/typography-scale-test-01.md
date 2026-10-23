# SGM Typography Scale Test 01

Hanken GroteskとVisual System C（Civic Character）を維持し、既存のSGM組版とGOV.UK Design Systemの現行モバイル向けType Scaleを比較する実験です。

## 比較案

- `scale=current` — Current SGM scale。既存のTA × Visual C組版。
- `scale=govuk` — GOV.UK mobile scale。Hanken Groteskのまま、GOV.UKのsmall screen向けサイズ、行間、regular / boldの役割を適用。

## GOV.UK案の役割

| SGM role | GOV.UK scale point | Mobile value | Weight | Tracking |
|---|---:|---:|---:|---:|
| Architecture title | 36 | 27px / 30px | 700 | 0 |
| Body / fact value / search | 19 | 19px / 25px | 400 | 0 |
| Metadata / label / action | 16 | 16px / 20px | 400 or 700 | 0 |

GOV.UK Frontend v6以降のsmall screen scaleを参照しています。書体はGDS Transportへ変更せず、SGMで選定中のHanken Groteskを使用します。Bold役割が合成表示にならないよう、Fontsourceの700 weightを追加しています。

参考資料:

- https://design-system.service.gov.uk/styles/type-scale/
- https://design-system.service.gov.uk/styles/headings/
- https://design-system.service.gov.uk/styles/paragraphs/
- https://frontend.design-system.service.gov.uk/sass-api-reference/

## URL

- Current: `?ui=b&font=a&visual=civic&map=m1&scale=current`
- GOV.UK: `?ui=b&font=a&visual=civic&map=m1&scale=govuk`

英語版の折りたたみ式`COMPARE`パネルに`TYPE SCALE`セレクターを追加しています。切替時に地図位置、ズーム、選択建築、Bottom Sheetの展開状態は変わりません。日本語版の組版はこの実験の対象外です。

## Bottom Sheet対応

GOV.UK案では、文字の拡大によるpreviewの欠けを避けるため、compact sheetの高さだけを最大285px / 43vhへ調整しました。expanded sheetは従来どおりviewport内でスクロールします。情報量、色、形状、操作構造は変更していません。
