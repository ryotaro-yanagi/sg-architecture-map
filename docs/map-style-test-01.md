# SGM Map Style Test 01

Typography A（Hanken Grotesk）× Visual System C（Civic Character）を基準に、同じOpenFreeMap LibertyスタイルをMapLibre GL JSのpaint propertyで調整する比較実験です。地図の再生成は行わず、中心位置、ズーム、選択中の建築、Bottom Sheetの展開状態を保ったまま切り替えます。

## 比較案

- M1 — Balanced Context: 道路、水面、緑地、ラベルの差を穏やかに保つ基準案。
- M2 — Quiet Infrastructure: 彩度とPOIラベルを抑え、道路階層と建築ピンを静かに読む案。
- M3 — Living Geography: 水面と緑地の識別を少し強め、都市の地理と建築ピンを生き生き見せる案。

3案とも、道路のcasingと道路種別、水面・水路、緑地・公園、建築物、地名・道路名・POIラベル、SGM建築ピンの色と強弱を調整します。ピンはcircle layerによる単純な記号のまま、選択時だけ色と大きさを変えます。

## URL

- `?ui=b&font=a&visual=civic&map=m1`
- `?ui=b&font=a&visual=civic&map=m2`
- `?ui=b&font=a&visual=civic&map=m3`

英語版の折りたたみ式 `COMPARE` パネルに `MAP STYLE` セレクターを追加しています。既存のTypography / Visual Systemセレクターも維持しています。

## 確認ポイント

- ズーム11前後で、海岸線・幹線道路・緑地・7件のピンの優先順位を比較する。
- ズーム14前後で、道路名・POI・建物形状・ピンの干渉を比較する。
- 建築を選択してBottom Sheetを展開したままM1/M2/M3を切り替え、地図状態と選択状態が維持されることを確認する。
- iPhone Safariでは、比較パネルを閉じた状態でも現在の組み合わせが `TA · C · M1` のように読めることを確認する。
