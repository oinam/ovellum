---
title: 用語集
description: ドキュメント全体に登場する用語の 1 行定義。
---

# 用語集

### アンカー (anchor)

ドキュメントの挿入ポイント。生成された Markdown ファイル内で、特定のソース
シンボルに対して人間が書いたコンテンツをマージャーが差し込む場所です。HTML
コメントとして表現されます。

```html
<!-- ovellum:anchor id="src/foo.ts::formatDate" generated="…" -->
```

自動生成されるすべてのセクションに 1 つ付きます。
[コンセプト → アンカーとゾーン](/ja/docs/concepts/anchors-and-zones/)を参照。

### アンカー ID (anchor ID)

アンカーの安定した識別子。形式: `{relativeFilePath}::{symbolPath}`。例:
`src/utils/format.ts::formatDate`、
`src/models/User.ts::User.constructor`、`src/index.ts::__module__`。

### `basePath`

サイトが配信される Jekyll 風のサブパス。`site.basePath` で設定します
（例: `'/ovellum'`）。レンダリング時に、すべての内部 URL、アセットパス、
canonical リンク、`sitemap.xml` エントリの前に付加されます。作者はルート相対
リンク（`/getting-started/`）を書き続け、ビルドがプレフィックスを追加します。
デフォルトは空 — サイトはルートから配信されます。

### 自動モード (auto mode)

もっともシンプルなパイプライン: ソースから IR、そして Markdown へ。ビルドのたびに
既存の出力が上書きされます。マージステップはありません。

### ブロックタグ (block tag)

[保護ゾーン](#保護ゾーン-protected-zone)を囲む Markdown の HTML コメントタグの組
（デフォルトは `<!-- @manual:start -->` / `<!-- @manual:end -->`）。
`protect.blockTag` で設定できます。

### パンくず (breadcrumbs)

ナビゲーション内で 2 階層以上深いページで、記事の上にレンダリングされる
「Section › Page」の経路。ナビツリーをルートから現在のページまでたどって計算され、
最後のエントリには `aria-current="page"` が付きます。トップレベルのページには付きません。

### CTA（行動喚起）

ランディングページのヒーローにあり、読者に何かを促すボタン。
`site.landing.hero.ctas` で設定します。

### Edit-this-page リンク

`site.editUrlPattern` が設定されているとき、各記事の下にレンダリングされる
「Edit this page」リンク。`{path}` プレースホルダーは、ビルドの作業ディレクトリを
基準としたページのソースパスに置換されるため、パターンは通常そのパスに対する
GitHub/GitLab/Bitbucket の「ファイル編集」URL を指します。

### フィーチャーカード (feature card)

ランディングページのフィーチャーグリッドの 1 セル。
`site.landing.features[]` で設定します。

### フロントマター (frontmatter)

Markdown ファイルの先頭、`---` 区切りの間にある YAML ブロック。`gray-matter` で
解析されます。ページのタイトル、説明、モードの上書きなどに使われます。

### ヒーロー (hero)

ランディングページの上部にある、横幅いっぱいのタイトル + サブタイトル + CTA の
ブロック。

### アイコンレジストリ (icon registry)

デフォルトテンプレートに同梱される小さなインライン SVG アイコンセット。
[Lucide](https://lucide.dev/) に基づいています。各アイコンは `stroke="currentColor"` と
`stroke-width="2"` で 24×24 でレンダリングされるため、周囲のテキストから色を継承し、
あらゆるテーマで自動的に機能します。公開ヘルパー: `@ovellum/site` パッケージの
`renderIcon(name, opts)`。

### ハイブリッドモード (hybrid mode)

デフォルトのモード。ソースから生成した後、前回の出力にあった既存の保護ゾーンを
マージで戻します。孤立は `.ovellum/orphans/` に送られます。

### インラインタグ (inline tag)

ドキュメントコメントを人間管理であると示す JSDoc タグ（デフォルトは `@preserve`）。
[ブロックタグ](#ブロックタグ-block-tag)のソースコード側の対応物です。

### IR（中間表現）

パーサーからジェネレーターへ渡される型付きの形。解析とレンダリングを分離します。

### ランディングページ (landing page)

`site.landing.enabled` が `true` のとき `/` でレンダリングされる、より幅広で
マーケティング風のページ。ヒーロー + フィーチャーグリッド + 任意の本文

- 任意のトラストストリップ。ドキュメントページは既存の URL を保ちます。

### 最終更新 (last modified)

[ページメタ](#ページメタ-page-meta)行の「Edited」の半分。ファイルが追跡されている
場合は `git log -1 --format=%cI -- <path>` から、そうでなければファイルシステムの
mtime から読み取ります。どちらも解決できなければ行を省略します。
`site.pageMeta.lastModified`（デフォルト `true`）で制御され、日付の表記
（`today` / `Jun 14, 2026` / `2026-06-14`）は `site.dateFormat` に従います。

### 手動モード (manual mode)

Markdown ファースト の静的サイトビルダー。ソースの解析は行いません。HTML + CSS +
最小限の JavaScript を生成します。

### 手動ブロック (manual block)

[保護ゾーン](#保護ゾーン-protected-zone)の同義語。仕様では「protected zones」と
呼びますが、ランタイムのコードでは「manual block」が好まれます。

### マージャー (merger)

新しく生成されたコンテンツと既存の保護ゾーンを組み合わせる役割を担うパッケージ。
孤立を隔離します。

### 孤立 (orphan)

ソースアンカーが現在の IR にもう存在しない保護ゾーン。メタデータとともに
`.ovellum/orphans/` に隔離され、黙って捨てられることはありません。
[コンセプト → 孤立](/ja/docs/concepts/orphans/)を参照。

### ページメタ (page meta)

各記事の上に読了時間と最終更新日を表示する小さな行: `2 min read · Edited May 17, 2026`。
`site.pageMeta` で設定し、どちらの半分も個別にオフにでき、両方を無効にすると行全体を
非表示にできます。

### Pagefind

`site.search.enabled` の裏で Ovellum が同梱する静的検索インデクサー。
[Pagefind](https://pagefind.app/) はビルド済み HTML から静的インデックスを生成し、
必要に応じてそれを読み込む小さなクライアントを同梱します — サーバー不要、
ランタイムのインデクサーもなしです。出力は `dist/pagefind/` に置かれます。

### プリティ URL (pretty URL)

manual モードでの出力パスの形。各ページは `{slug}/index.html` になるため、URL は
`/{slug}/` です。リライトなしであらゆる静的ホストで動作します。

### 保護ゾーン (protected zone)

Markdown ファイル内の `<!-- @manual:start id="…" -->` … `<!-- @manual:end -->` の
領域で、その内容は再生成をまたいでそのまま保持されます。
[コンセプト → アンカーとゾーン](/ja/docs/concepts/anchors-and-zones/)を参照。

### 印刷用スタイルシート (print stylesheet)

デフォルトテンプレートの `@media print` ルール。クローム（トップバー、サイドバー、
目次、検索、前後リンク、編集リンク）を隠し、記事を広げ、外部リンクの URL を
インラインで印刷し、コードブロック内での改ページを避けます。設定は不要 —
読者が印刷したときに自動的に効きます。

### 隔離 (quarantine)

孤立のレコードを破棄する代わりに `protect.orphanDir` 配下のディスクに書き出す行為。
孤立ファイルは人間が読める Markdown で、PR でレビューできます。

### 読了時間 (reading time)

[ページメタ](#ページメタ-page-meta)行の「N min read」の半分。コードブロック、
インラインコード、リンク URL、HTML、見出しの記号を除去した上で、可視の文章を約
200 wpm で数えます。常に最低 1 分です。`site.pageMeta.readingTime`（デフォルト
`true`）で制御されます。

### サニタイズ (sanitization)

レンダリングされた Markdown から危険な HTML を取り除くパス。`renderMarkdown` は、
shiki がコードブロックをハイライトする前に、すべてのソースを
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) に通します。
除去されるもの: `<script>`、`<iframe>`、`<object>`、`<embed>`、`on*` イベント
ハンドラー、そして許可リストにないスキームの URL（`javascript:`、`vbscript:`、
`data:` はすべて除去されます — `data:image/svg+xml` が実行可能な JS を運びうるため、
`<img>` 上の `data:` も含みます）。完全なポリシーは
[セキュリティ](/ja/docs/reference/security/)を参照。

### `@preserve`

ソースコメントに付ける JSDoc タグ（デフォルトのインラインタグ）で、そのコメントの
説明を保護ゾーンで自動的に囲むようジェネレーターに指示します — これにより、その説明への
ユーザーの編集が再生成をまたいで残ります。

### トップバーナビ (topbar nav)

`site.topbarNav` で駆動される、トップバー右寄せのナビゲーション。リンクはすべての
ページでブランドの横に順に表示されます。外部リンクには小さなアイコンが付き、新しい
タブで開きます。720px 未満では、ナビは全幅のシートを開くハンバーガーボタンに
折りたたまれます。

### トラストストリップ (trust strip)

ランディングページの下部、フッターの上にレンダリングされる、任意のパートナー／
スポンサー／「powered by」リンクの行。`site.landing.trustStrip` で設定します。

### shiki

ビルド時に使われる TextMate 文法ベースの構文ハイライター。CSS 変数を含む HTML を
出力するため、1 回のビルドでライトとダークのコードブロックテーマの両方を、ランタイム
コストゼロで配信します。

### `ts-morph`

パーサーが使う TypeScript コンパイラ API のラッパー。生のコンパイラ API より扱いやすい
インターフェースを提供し、完全な型情報を保持します。
