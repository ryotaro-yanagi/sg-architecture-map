# SGM Design Set Test 01

`SGM_Design_Direction_v0.2`を判断基準に、Typography A（Hanken Grotesk）を固定し、Visual SystemとMap Styleの組み合わせを3案へ絞った比較実験です。B案Bottom Sheet、建築情報、検索、現在地、言語切替などの機能は共通です。

## 3案

| Preset | Typography | Type scale | Visual | Map |
|---|---|---|---|---|
| P1 | TA / Hanken Grotesk | SGM light mobile | A / Cartographic Clarity | M3 / Living Geography |
| P2 | TA / Hanken Grotesk | SGM light mobile | C / Civic Character | M3 / Living Geography |
| P3 | TA / Hanken Grotesk | SGM light mobile | A / Cartographic Clarity | M1 / Balanced Context |

## 軽量組版

GOV.UKのモバイル向けType Scaleから、27px / 30px、19px / 25px、16px / 20pxの3段階を継承しています。Hanken GroteskではGOV.UK案の700がやや強く見えたため、SGM light mobileでは見出しと主要操作を600、本文とメタ情報を400に設定しました。字間は原則0です。

## 切替

英語版の折りたたみ式`COMPARE`パネルに`DESIGN SET`としてP1 / P2 / P3を追加しています。プリセットは`preset=1`、`preset=2`、`preset=3`で直接指定できます。プリセット選択時はTA、SGM light mobile、Visual、Mapをまとめて変更します。

個別のTypography、Type Scale、Visual System、Map Styleセレクターも残しています。個別変更によって3案から外れた場合は`Custom combination`として表示します。

地図スタイルは既存レイヤーのpaint propertyだけを変更するため、切替時に地図位置、ズーム、選択建築、Bottom Sheetの展開状態は維持されます。
