# SGM Typography Test 02

英語版のB案（Bottom Sheet）を共通条件として、`SGM_Typography_Study_v0.1` の3案を書体だけで比較する実験です。サイズ、ウェイト指定、行間、字間、余白、色、形状、情報量は既存値を維持し、日本語版には実験用フォントクラスを適用しません。

## 比較URL

- `en/?ui=b&font=a` — Quiet Grotesque: Hanken Grotesk
- `en/?ui=b&font=b` — Legible Character: Atkinson Hyperlegible Next
- `en/?ui=b&font=c` — Editorial Restraint: DM Sans + Newsreader

英語版右側の `TYPE TEST` スイッチでも切り替えられます。比較対象はA/B/Cの3案だけです。長い建築名は「Esplanade – Theatres on the Bay」、複数設計者は「People’s Park Complex」、数字は詳細の竣工年・住所・レコード番号で確認します。

## 読み込むファイル

新規2書体はFontsource v5.3.0のLatinサブセットだけをnpmパッケージから自己ホストします。

- Hanken Grotesk: 400、500、600
- Atkinson Hyperlegible Next: 400、500、600
- DM Sans: 400、500、600（既存のGoogle Fonts読み込みを継続）
- Newsreader: 500（既存のFontsource自己ホストを継続）

4書体ともSIL Open Font License 1.1です。実験スイッチは `document.fonts.load()` と `document.fonts.check()` で各案に必要なフェイスを検査し、完了時に `fonts ready` と表示します。

## 配布元・ライセンス

- [Hanken Grotesk — Fontsource](https://fontsource.org/fonts/hanken-grotesk/about)
- [Atkinson Hyperlegible Next — Fontsource](https://fontsource.org/fonts/atkinson-hyperlegible-next/about)
- [DM Sans — Fontsource](https://fontsource.org/fonts/dm-sans/about)
- [Newsreader — Fontsource](https://fontsource.org/fonts/newsreader/about)
