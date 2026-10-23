# SG Architecture Map — Prototype 01

シンガポールの建築を地図から発見する、モバイルファーストの技術試作です。Vite、React、TypeScript、MapLibre GL JSで構成しています。英語を初期言語とし、英語版と日本語版をURLで分離しています。

## ローカル実行

```bash
npm install
npm run dev
```

公開前チェックは `npm run check:publish`、静的ビルドは `npm run build`、確認は `npm run preview` です。`vite.config.ts` の相対 `base` により、GitHub Pagesのリポジトリ配下でもアセットを読み込めます。

## UI比較

- `?ui=a`: 小さな浮遊プレビュー + 詳細パネル
- `?ui=b`: 下部シート + 展開詳細

画面右上の `UI A / B` からも切り替えられます。

実験ブランチでは、Typography A × Visual System Cを基準にした地図スタイルを `?map=m1`、`?map=m2`、`?map=m3` で比較できます。英語版の `COMPARE` パネルからも切り替えられます。詳細は `docs/map-style-test-01.md` を参照してください。

英語版の組版は、既存のTA × Visual Cを`?scale=current`、GOV.UKのモバイル向けType ScaleをHanken Groteskへ適用した案を`?scale=govuk`で比較できます。詳細は`docs/typography-scale-test-01.md`を参照してください。

公開後は次のURLをiPhone Safariで開き、同じデータ・条件で比較します。

- `https://<account>.github.io/<repository>/en/?ui=a`
- `https://<account>.github.io/<repository>/en/?ui=b`
- `https://<account>.github.io/<repository>/ja/?ui=a`
- `https://<account>.github.io/<repository>/ja/?ui=b`

リポジトリ直下のURLは、クエリとハッシュを保ったまま `/en/` へ移動します。表示文言と建築名・設計者表記は `src/i18n.ts`、ID・座標・出典などの共通事実は `src/data/buildings.json` で管理します。言語切替時には同じタブ内の一時ストレージを使い、地図位置、ズーム、選択中の建築、詳細の開閉を引き継ぎます。

実機確認項目は `docs/mobile-verification-checklist.md` にあります。

## GitHub Pages

`.github/workflows/deploy-pages.yml` は `main` へのpushまたは手動実行で、公開前チェック、ビルド、Pagesへのデプロイを行います。

1. GitHubで空のリポジトリを作成する（推奨名: `sg-architecture-map`）。
2. このディレクトリで次を実行し、`main` をpushする。

```bash
git init
git branch -M main
git add .
git commit -m "Prepare SGM Prototype 01 for GitHub Pages"
git remote add origin https://github.com/<account>/<repository>.git
git push -u origin main
```

3. GitHubの `Settings → Pages → Build and deployment → Source` で `GitHub Actions` を選ぶ。
4. `Actions` のデプロイ完了後、表示された公開URLを開く。

## データについて

7件の試作データのみを収録しています。座標は暫定の代表点です。写真、公開アクセス可否、未確認の竣工年は補完していません。地図スタイルはOpenFreeMap Libertyを使用し、MapLibreの地図上に提供元クレジットを表示します。
