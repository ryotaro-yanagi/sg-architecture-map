# SGM Typography Test 01

英語版のB案（Bottom Sheet）を共通条件として、書体だけを比較する実験です。サイズ、余白、色、形状、情報量は既存値を維持します。日本語版には実験用フォントクラスを適用しません。

## 比較URL

- `en/?ui=b&font=1` — Friendly Utility: Apfel Grotezk
- `en/?ui=b&font=2` — Quiet Editorial: Instrument Sans + Newsreader
- `en/?ui=b&font=3` — Civic Simplicity: Instrument Sans

英語版右側の `TYPE TEST 01` スイッチでも切り替えられます。長い建築名は「Esplanade – Theatres on the Bay」、複数設計者は「People’s Park Complex」、数字は詳細の竣工年・住所・レコード番号で確認します。

## 読み込むファイル

Fontsource v5.3.0のLatinサブセットだけをnpmパッケージから自己ホストします。

- Apfel Grotezk: 400、700
- Instrument Sans: 400、600
- Newsreader: 500

3書体ともSIL Open Font License 1.1です。実験スイッチは `document.fonts.load()` と `document.fonts.check()` で各案に必要なフェイスを検査し、完了時に `fonts ready` と表示します。
