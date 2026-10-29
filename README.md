# Omebu AI Lab(仮称)

個人開発の作品(ソフトウェア、AIツール、シミュレータ、ゲーム)を紹介するポートフォリオサイトです。
`data/*.json` を編集して `node scripts/build.mjs` を実行すると、静的HTMLが `dist/` に出力されます。
依存パッケージはなく、Node.js 20 以上だけで動きます。バックエンドはありません。

## ディレクトリ

| パス | 内容 |
| --- | --- |
| `data/site.json` | サイト名、キャッチコピー、開発方針、リンク、連絡先、カテゴリ、状態ラベル |
| `data/works.json` | 作品データ(1作品=1オブジェクト) |
| `data/profile.json` | 開発についてページ |
| `public/` | 画像などの静的ファイル。`dist/assets/` にコピーされる |
| `src/` | CSS と favicon |
| `scripts/build.mjs` | ビルド(共通ヘッダー・フッター、各ページのテンプレート) |
| `scripts/serve.mjs` | ローカル確認用サーバ |
| `.github/workflows/pages.yml` | GitHub Pages への自動公開 |
| `TODO.md` | 開発者に確認する事項の一覧 |

## ローカル確認

```bash
npm run preview   # http://localhost:8080/
```

## 作品を追加・更新する

`data/works.json` に項目を追加するだけで、一覧・詳細ページが生成されます。
**値が空(`[]` / `""` / `null`)の項目は、詳細ページに表示されません。**

- `status`: `released`(公開中) / `developed`(開発済み) / `in-progress`(開発中) / `concept`(構想段階) / `checking`(状況確認中)
- `category`: `data/site.json` の `categories` の id。追加・変更はそこで行う
- `featured: true`: トップの注目作品(先頭3件まで)
- `unverified: true`: 「情報は確認中」の注意書きを出す。内容が確定したら削除する
- `thumbnail`: `{ "src": "assets/works/<slug>/thumb.webp", "alt": "...", "width": 1280, "height": 720 }`。`null` の間は「仮画像」が表示される
- `screenshots`: `[{ "src": "assets/works/<slug>/1.webp", "alt": "...", "caption": "...", "width": 1280, "height": 720 }]`
- `videos`: `[{ "youtube": "動画ID", "title": "..." }]` または `[{ "src": "assets/works/<slug>/demo.mp4", "poster": "..." }]`
- `links`: `[{ "label": "GitHub", "url": "https://..." }]`(外部リンクは別タブ・`noopener noreferrer` で出力される)

画像は `public/assets/works/<slug>/` に置きます。幅1600px以内の WebP / JPEG にリサイズしてから置くと軽量に保てます。

## GitHub Pages で公開する

1. GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
2. `main` ブランチにマージ(push)すると、自動でビルド・公開される。
3. 公開URLが決まったら `data/site.json` の `url` に入れる(canonical・OGP・sitemap.xml・robots.txt が出力される)。

内部リンクはすべて相対パスです。`https://ユーザー名.github.io/Omebu_AI_Lab/` のようなサブパスでも、独自ドメインでも、設定変更なしで動きます。

## 将来の拡張

- **作品の専用サイト化**: 作品の情報・画像は `works.json` の1項目と `public/assets/works/<slug>/` にまとまっているので、そのまま別リポジトリへ移せる。
- **英語対応**: `data/` を言語ごとに分け、`build.mjs` の出力先を `en/` に増やす想定。
- **ブログ・ダウンロードページ**: `build.mjs` にページ生成関数を追加する。
