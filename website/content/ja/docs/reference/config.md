---
title: 設定
description: ovellum.config.{json,ts,js} のすべてのフィールドと、その型・デフォルト値・効果。
sourceHash: '2ce1207c0f4b0fc4'
---

# 設定

`ovellum.config.*` に置くすべてのフィールド。これが正式な情報源であり、
スキーマ変更があれば同時に更新されます。

> **ヒント:** `ovellum init` は、すべてのオプションを含む完全にコメント付きの
> `ovellum.config.ts` を書き出します。有効なものは設定済み、その他はデフォルト値と
> 許容値とともにコメントアウトされています。すべてそのファイル内でいじることができ、
> このページはより詳細なリファレンスです。

## ファイル形式

プロジェクトのルートに `ovellum.config.{ts,mts,cts,js,mjs,cjs,json}` を置きます。
検出は [`c12`](https://github.com/unjs/c12) によって行われ、列挙したすべての拡張子が動作します。

**TypeScript（推奨）:**

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'hybrid',
  input: './src',
  output: './docs',
});
```

**JSON:**

```json
{
  "mode": "hybrid",
  "input": "./src",
  "output": "./docs"
}
```

すべてのフィールドは省略可能で、適切なデフォルト値が適用されます。

## トップレベルのフィールド

| Field             | Type                             | Default                                                               | 説明                                                      |
| ----------------- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `name`            | `string`                         | `package.json#name`                                                   |                                                            |
| `version`         | `string \| 'auto'`               | `'auto'`                                                              | `'auto'` は `package.json#version` を読み取ります。                     |
| `mode`            | `'hybrid' \| 'manual' \| 'auto'` | `'hybrid'`                                                            | [コンセプト → モード](/ja/docs/concepts/modes/)を参照。                  |
| `input`           | `string`                         | `'./src'`                                                             | auto/hybrid では TS ソースディレクトリ、manual では `.md` コンテンツディレクトリ。 |
| `output`          | `string`                         | `'./docs'`                                                            | auto/hybrid では Markdown ディレクトリ、manual では HTML ディレクトリ。           |
| `include`         | `string[]`                       | `['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']`                      | `input` を基準とした glob。                                 |
| `exclude`         | `string[]`                       | `['node_modules', 'dist', '**/*.test.*', '**/*.spec.*', '**/*.d.ts']` | `input` を基準とした glob。                                 |
| `includeInternal` | `boolean`                        | `false`                                                               | `@internal` タグ付きシンボルを含めます。                        |
| `includePrivate`  | `boolean`                        | `false`                                                               | `private` なクラスメンバーを含めます。                         |
| `defaultFormat`   | `'md' \| 'mdx'`                  | `'md'`                                                                | `manual` モードは v1 では `'md'` が必須です。                   |
| `protect`         | `ProtectConfig`                  | 下記参照                                                             |                                                            |
| `site`            | `OvellumSiteConfig`              | 下記参照                                                             |                                                            |
| `update`          | `OvellumUpdateConfig`            | 下記参照                                                             | CLI の更新チェックの挙動。                                |

## `protect`（hybrid モード + マージャー）

hybrid モードでマージエンジンと孤立の扱いを制御するために使われます。

```typescript
interface ProtectConfig {
  blockTag: string;
  inlineTag: string;
  orphanStrategy: 'quarantine' | 'warn';
  orphanDir: string;
  orphanRetention: number;
}
```

| Field             | Type                     | Default              | 説明                                                                                                      |
| ----------------- | ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `blockTag`        | `string`                 | `'@manual'`          | Markdown のコメントタグ。`<!-- {blockTag}:start id="…" -->` として使われます。明確な理由がある場合のみ変更してください。 |
| `inlineTag`       | `string`                 | `'@preserve'`        | ドキュメントコメントを人間管理であると示す JSDoc タグ。                                                       |
| `orphanStrategy`  | `'quarantine' \| 'warn'` | `'quarantine'`       | `'quarantine'` は `orphanDir` に書き出し、`'warn'` は表示のみ行います。                                                |
| `orphanDir`       | `string`                 | `'.ovellum/orphans'` | プロジェクトルートからの相対パス。VCS にコミットすべきです。                                                      |
| `orphanRetention` | `number`                 | `90`                 | 将来の `ovellum orphans --stale` で孤立が「古い」と判定されるまでの日数。                              |

## `site`（manual モード）

静的サイトビルダーが利用する設定です。

```typescript
interface OvellumSiteConfig {
  title?: string;
  logo?: string;
  favicon?: string;
  home?: string;
  description?: string;
  baseUrl?: string;
  basePath?: string;
  locales?: { code: string; label: string; strings?: Record<string, string> }[];
  defaultLocale?: string;
  defaultTheme: 'auto' | 'light' | 'dark';
  palette: 'default' | 'nord' | 'flexoki' | 'solarized' | 'eink';
  accent?: string;
  font: 'sans' | 'serif' | 'inter' | 'geist';
  dateFormat: 'humanized' | 'iso';
  codeTheme: 'github' | 'nord' | 'solarized';
  footer: string;
  credit: boolean;
  editUrlPattern?: string;
  headExtra?: string;
  search: { enabled: boolean };
  pageMeta: { readingTime: boolean; lastModified: boolean };
  sidebar: { collapse: boolean };
  backToTop: { enabled: boolean; threshold: number };
  publicDir: string;
  ignoreFolders: string[];
  ignoreFiles: string[];
  topbarNav: Array<{ label: string; href: string; icon?: string; external?: boolean }>;
  footerNav: Array<{ label: string; href: string; icon?: string; external?: boolean }>;
  landing: OvellumLandingConfig;
}
```

| Field            | Type                                | Default                       | 説明                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | `string?`                           | `name` ↦ `'Ovellum site'`     | トップバーと `<title>` で使われます。                                                                                                                                                                                              |
| `logo`           | `string?`                           | `undefined`                   | タイトルの前に表示される任意のブランドマーク。画像へのパス／URL です。`public/` に置いてルートから参照します（例: `'/logo.svg'`）。**テーマに合わせて反転するモノクロのシルエット**として描画されるため（CSS マスクで前景色で描画）、単色の SVG/PNG を指定してください。**未設定 = マークなし。タイトルテキストだけが残ります。** 装飾的な要素であり、アクセシブルな名前はタイトルが担います。（CSS の `url()` に入るため、引用符・括弧・空白を含めてはいけません。） |
| `favicon`        | `string?`                           | `'/favicon.ico'`              | favicon へのパス／URL。デフォルトは `/favicon.ico` です。`public/` フォルダに `favicon.ico` を置けばルートで配信されるので、そのまま機能します。別の場所を指す場合はこれを設定します（例: `'/icon.svg'`）。basePath に対応しています。 |
| `home`           | `string?`                           | auto                          | `/` でレンダリングされる Markdown ファイル。`input` を基準としたルートレベルのパスです（例: `'overview.md'`）。**未設定の場合、ホームは自動解決されます。`index.md`、なければルートの `README.md`** です。これにより、リポジトリの README が設定なしでドキュメントのホームになります。それを望まない場合は、`README.md` を `ignoreFiles` に追加するか、`home` を設定してください。 |
| `description`    | `string?`                           | `undefined`                   | `<meta>` とフッターで使われます。                                                                                                                                                                                               |
| `baseUrl`        | `string?`                           | `undefined`                   | 例: `'https://docs.example.com'`。`<link rel="canonical">`、OG カード、`sitemap.xml` で使われます。相対リンク出力にする場合は省略します。                                                                                          |
| `basePath`       | `string?`                           | `''`                          | Jekyll 風のサブパス。先頭にスラッシュ、末尾にスラッシュなし（例: `'/ovellum'`）。すべての内部 URL、アセットパス、canonical リンク、サイトマップエントリの前に付加されます。作者はルート相対リンクを書き続けられ、ビルドがプレフィックスを追加します。 |
| `locales`        | `{ code, label, strings? }[]?`      | `undefined`                   | **オプトインの i18n。** 各エントリが 1 つの言語です。`code` は BCP 47 タグ（`'en-US'`、`'ja'`、`'zh-Hans'`）であり、同時に `content/<code>/` フォルダ名と `<html lang>` でもあります。`label` はピッカーに表示するテキストです（自称表記を使ってください。例: `'日本語'`）。任意の `strings` マップは、そのロケールについてテンプレート組み込みの UI クロムを上書きします（`tocTitle`、`editedLabel`、`backToTop` などのキー。組み込みの上にマージされ、不足分は英語が埋めます） — 組み込みクロムは英語と日本語で出荷され、RTL 言語には `<html dir="rtl">` が付きます。設定すると、コンテンツがロケールごとのサブツリーに移り、トップバーに言語ピッカーが現れ、各ページに `hreflang` が付きます。未設定 = 単一言語（移行不要）。[i18n ガイド](/ja/docs/guides/i18n/)を参照。 |
| `defaultLocale`  | `string?`                           | `locales` の最初の要素            | どの `locales[].code` を**ルート**（URL プレフィックスなし）で配信するか。残りは `/<code>/` 配下で配信されます。`locales` が未設定の場合は無視されます。                                                                                              |
| `defaultTheme`   | `'auto' \| 'light' \| 'dark'`       | `'auto'`                      | ユーザーの設定が読み込まれる前の初期ライト／ダークモード。閲覧者はトップバーの外観コントロールから変更できます（`localStorage` に保存）。                                                                                  |
| `palette`        | `'default' \| 'nord' \| 'flexoki' \| 'solarized' \| 'eink'` | `'default'`  | ユーザーの設定が読み込まれる前の初期のページ全体のカラーパレット（`'default'` はピッカーでは「Ovellum」と表示）。すべてのパレットはライト**と**ダークの両方のバリアントを備え、モードの選択とは独立しています。閲覧者はトップバーの外観コントロールからパレットを切り替えられます。            |
| `accent`         | `string?`                           | `undefined`                   | デフォルトのプライマリカラー。任意の CSS カラー値（`'#3b82f6'`、`'oklch(57% 0.16 255)'` など）。CTA ボタンに加え、リンク、フォーカスリング、目次インジケーターを制御します。ホバー状態は自動的にブレンドされます。未設定 = 各パレット固有のプライマリ。閲覧者は外観コントロール（「Color」）から上書きできます。 |
| `font`           | `'sans' \| 'serif' \| 'inter' \| 'geist'` | `'sans'`                | 初期の本文フォント、およびページ内の **Font** ピッカーのデフォルト。`'sans'` / `'serif'` はシステムフォントスタックです（ウェブフォントなし — 初回描画が即座）。`'inter'` / `'geist'` は**テンプレートにバンドルされた**ウェブフォントで（`/assets/fonts/` から配信）、実際にページで使われたときだけ読み込まれます。コードは常に等幅のままです。閲覧者は外観コントロールからフォントをライブで変更でき、読みやすさのための **Text size**（5 段階）も調整できます。どちらも `localStorage` に保存されます。 |
| `dateFormat`     | `'humanized' \| 'iso'`              | `'humanized'`                 | ページの **Edited** 行の日付の表示方法。`'humanized'` → 最近の編集は `today` / `yesterday`（ビルド時点を基準）、それ以外は親しみやすい `Jun 14, 2026`。`'iso'` → 生の `2026-06-14`。いずれの場合も、機械可読な日付は常に `<time datetime>` 属性に入ります。 |
| `codeTheme`      | `'github' \| 'nord' \| 'solarized'` | `'github'`                    | フェンス付きコードブロック用の Shiki テーマペア。ペアの両方が CSS 変数で出力されるため、1 回のビルドでライトとダークの両方を配信します。`github` → github-light + github-dark、`nord` → min-light + nord（nord はダーク専用）、`solarized` → solarized-light + solarized-dark。 |
| `footer`         | `string`                            | `''`                          | フッターのテキスト（例: 著作権表示。ビルド日付とともにレンダリングされます）。空文字列にするとフッターテキストは表示されません。 |
| `credit`         | `boolean`                           | `true`                        | フッターに小さな「Built with Ovellum」のクレジットリンクを表示します（→ <https://ovellum.oss.oinam.com>）。`false` にすると削除されます。クレジットはありがたいですが、決して必須ではありません。 |
| `editUrlPattern` | `string?`                           | `undefined`                   | `{path}` プレースホルダーを含む URL パターン。`{path}` はページのソースパスで、**ビルドの cwd（`--cwd`）を基準**とします。リポジトリのプレフィックスは自分で含めてください（例: `'https://github.com/owner/repo/edit/main/website/{path}'`）。未設定の場合、「Edit this page」リンクはレンダリングされません。 |
| `headExtra`      | `string?`                           | `undefined`                   | 全ページの `<head>` に、検索関連の要素の直後・インラインのテーマ初期化スクリプトの直前に、そのまま注入される生の HTML。**エスケープもサニタイズもされません** — 自分で管理しているマークアップのみを設定してください。デフォルトは未設定。主な用途は分析スニペットです（例: `'<script defer src="https://analytics.example.com/script.js" data-website-id="…"></script>'`）。 |
| `search`         | `{ enabled: boolean }`              | `{ enabled: false }`          | `true` のとき、`ovellum build` は出力ディレクトリに対して Pagefind を実行し、トップバーに検索ボックスが追加されます。ビルドに `dist/pagefind/` が加わります。                                                                                       |
| `pageMeta`       | `{ readingTime, lastModified }`     | 両方 `true`                   | 記事の上のページごとのメタ行: `N min read · Edited Jun 14, 2026`。`readingTime` はコード／HTML を除いた上で約 200 wpm で推定します。`lastModified` はまず git（`git log --follow --diff-filter=AM` — リネームを追跡し純粋な移動を無視するため、最後に内容を編集した日付を反映）を優先し、なければファイルシステムの mtime にフォールバックします。どちらも解決できなければ行は省略されます。いずれかを `false` にするとその半分が非表示になります。日付の表記は [`dateFormat`](#dateformat) に従います。 |
| `sidebar`        | `{ collapse: boolean }`             | `{ collapse: true }`          | サイドバーのフォルダの挙動。`collapse: true`（デフォルト）は各フォルダを折りたたみ可能な開閉要素として、初期状態は閉じてレンダリングします。現在のページを含む枝は常に開いたままなので、自分の現在地が分かります。`collapse: false` にするとツリー全体を自動展開してレンダリングします。フォルダの `_meta.json` で `"collapse": false`（常に開く）または `"collapse": true`（常に閉じる）として、フォルダごとに上書きできます。 |
| `backToTop`      | `{ enabled, threshold }`            | `{ enabled: true, threshold: 360 }` | フローティングの「back to top」ボタン。`enabled: false` で削除します。`threshold` はフェードインするまでのスクロール距離（px）です。短いページのサイトでは早く現れるよう下げ、もっと下までスクロールするまで隠したいなら上げます。 |
| `assetBaseUrl`   | `string?`                           | `undefined`                   | `publicDir` のアセット用の CDN／ベース URL（例: `'https://cdn.example.com/site'`）。**設定すると**、Ovellum は `publicDir` のローカルコピーをやめ（その内容は CDN でホストします）、レンダリング済み HTML 内のそれらのファイルへの参照を CDN に書き換えます: `/img/logo.svg` → `https://cdn.example.com/site/img/logo.svg`。どちらの場合も、作者は同じルート絶対パスを書きます。Vite の `base` / Next の `assetPrefix` のようなものです。`publicDir` の*外*のアセットはそのままです。（クエリ文字列付きや `srcset` の参照は書き換えられません。） |
| `publicDir`      | `string`                            | `'public'`                    | **予約済み**の静的アセットフォルダ（`input` ルート直下の単一の名前）。その内容は**出力ルートにそのままコピー**されます — `public/favicon.ico` → `/favicon.ico`、`public/img/logo.svg` → `/img/logo.svg` — SSG の慣習です（Next/Astro/Vite/VitePress/Hugo）。ルートで配信されるファイル（favicon、`robots.txt`、`CNAME`、OG 画像）やその他の静的アセットに使います。中身は一切処理されません（ページもサイドバーもなし。`.md` ですらそのままコピーされます）。Ovellum の予約フォルダ名の最初のもので、それの*外*にある静的ファイルはパスを保ったまま通過します。 |
| `ignoreFolders`  | `string[]`                          | `[]`                          | manual モードのサイトから完全に除外するフォルダ**名**（任意の深さでマッチ） — サイドバーに出ず、レンダリングもされず、出力にもコピーされません。WIP／プライベートなディレクトリに使います。フォルダは `_meta.json` の `"hidden": true` で自己非表示にもでき、単一ページはフロントマターの `draft: true` で非表示にできます。（`public/` のようなアセット専用フォルダは、すでに自動的にサイドバーから除外されています。） |
| `ignoreFiles`    | `string[]`                          | `[]`                          | 除外するファイルの **glob** — Markdown ページとパススルーのアセットの両方が対象で、`build` **と** `check` の双方で尊重されます。スラッシュなしのパターンは任意の深さで basename にマッチし（`README.md`、`*.draft.md`）、スラッシュ付きのパターンは `input` を基準とした相対パスにマッチします（`drafts/**`）。`*`、`**`、`?` をサポートします。単一ファイル（例: リポジトリの `README.md`）を、そのファイルに触れずに除外するのに使えます。**常に自動除外**（設定不要）: ドットファイル、`node_modules`、パッケージのマニフェスト／ロックファイル、Ovellum の設定、出力ディレクトリ自身 — これにより `input: "."` でもプロジェクトファイルが漏れません。 |
| `topbarNav`      | `Array<{label, href, icon?, external?}>` | `[]`                     | 検索ボックスの右側に順に表示されます。`icon` を持つ項目はデスクトップではアイコンのみで表示され（ラベルはスクリーンリーダー用に保持）、モバイルのシート内ではアイコン + ラベルで表示されます。外部リンク（`external: true` または `href` が `http(s)://` で始まるもの）は `rel="noopener"` 付きで新しいタブで開きます。テキスト項目には小さな外部リンクアイコンも付きます。720px 未満では上段はロゴ + バージョン + 検索 + ハンバーガーだけになり、ナビとテーマ切り替えはシートに移ります。 |
| `landing`        | `OvellumLandingConfig`              | `{ enabled: false, … }`       | 下記参照。                                                                                                                                                                                                                     |

### `topbarNav[]`

| Field      | Type      | 説明                                                                                                                            |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`  | 表示されるリンクテキスト。`icon` が設定されていてもスクリーンリーダー用に保持されます。                                                              |
| `href`     | `string`  | 内部パス（`/guides/themes/`）または絶対 URL。                                                                               |
| `icon`     | `string?` | レジストリのアイコン名（`github`、`package`、`rss`、`mail` など）。デスクトップではアイコンのみ、モバイルのシートではアイコン + ラベルでレンダリングされます。      |
| `external` | `boolean?`| 外部リンクの扱いを強制します（新しいタブ + `rel="noopener"`）。`href` が `http://` または `https://` で始まる場合は自動的に true になります。           |

### `search`

`{ enabled: boolean }`。`true` のとき、ビルドは:

1. 出力ディレクトリに対して [Pagefind](https://pagefind.app/) を実行し、
   `dist/pagefind/` 配下に静的検索インデックスを生成します。
2. Pagefind の UI をトップバーに追加します。Ovellum のデザイントークンでテーマ付けされ、
   アクセント／前景／背景の色を自動的に継承します。

ランタイムのインデクサーはありません。検索結果はサイトに同梱された静的インデックスから
得られるため、サーバー不要であらゆる静的ホストで動作します。

### `pageMeta`

`{ readingTime: boolean, lastModified: boolean }`。どちらもデフォルトは `true`。

- **`readingTime`** — 可視の文章の語数を数え（コードブロック、インラインコード、
  リンク URL、HTML、見出しの記号を除去）、約 200 wpm で割り、切り上げます。
  常に最低 `1 min read` です。
- **`lastModified`** — ページのフロントマターの **`updated:`** が設定されていれば
  それが優先されます（例: `updated: 2026-05-20` — 日付を明示的に固定します。
  解析できない値は警告を出してフォールバックします）。なければ git
  （`git log --follow --diff-filter=AM -1 --format=%cI -- <path>`）を試します。
  リネームを追跡し、**内容**を変更したコミットだけを数えるため、ファイルの移動
  （`git mv`）で日付がリセットされません。ファイルが追跡されていない、
  または git が使えない場合はファイルシステムの mtime にフォールバックします。
  どちらも解決できなければ省略されます。行の **Edited** の半分としてレンダリングされ、
  表記は [`dateFormat`](#dateformat) に従います（`Edited today` / `Edited Jun 14, 2026`
  / `Edited 2026-06-14`）。

いずれかを `false` にするとその半分が非表示になります。両方を `false` にすると
メタ行全体が非表示になります。

## `site.landing`

通常のドキュメントインデックスの代わりに `/` でレンダリングされる、オプトインの
ランディングページです。デフォルトでは無効です。有効にすると、`content/index.md` は
警告とともにスキップされます（ランディングがそれを置き換えます）。

```typescript
interface OvellumLandingConfig {
  enabled: boolean;
  docsHref?: string;
  hero: {
    title?: string;
    subtitle?: string;
    ctas: Array<{ label: string; href: string; style?: 'primary' | 'secondary' }>;
  };
  features: Array<{ icon?: string; title: string; description: string }>;
  install?: Array<{ title: string; code: string; lang?: string }>;
  trustStrip?: {
    label?: string;
    items: Array<{ name: string; href?: string; image?: string }>;
  };
}
```

| Field        | Type                        | Default            | 説明                                                                                             |
| ------------ | --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `enabled`    | `boolean`                   | `false`            | `false` のとき、`/` は従来どおり（通常のドキュメントインデックス）に動作します。                                      |
| `docsHref`   | `string?`                   | 最初のサイドバーページ | トップバーの **Docs** リンクが指す先。                                                                           |
| `hero`       | `OvellumLandingHero`        | `{ ctas: [] }`     | タイトルは `site.title` にフォールバックします。最初の CTA はデフォルトで `primary` スタイル、残りは `secondary` です。 |
| `features`   | `OvellumLandingFeature[]`   | `[]`               | ドキュメント順のフィーチャーカード。マージ時にまるごと置き換えられます。                                     |
| `install`    | `OvellumLandingInstall[]?`  | 省略               | ヒーローの CTA の後・フィーチャーグリッドの前にレンダリングされるインストールスニペット。タイトルは各コードブロック内の先頭コメントになります。インストールスニペットは言語ラベルなしでレンダリングされ、右端に垂直方向で中央寄せされたアイコン式コピーボタンが付きます。他の場所のドキュメントコードブロックには影響しません（言語のラベルとテキスト式コピーボタンは保持されます）。 |
| `trustStrip` | `OvellumLandingTrustStrip?` | 省略               | 存在し、かつ `items` が空でない場合に最後にレンダリングされます。                                              |

### `hero.ctas[]`

| Field   | Type                        | 説明                                                |
| ------- | --------------------------- | ---------------------------------------------------- |
| `label` | `string`                    | ボタンのテキスト。                                         |
| `href`  | `string`                    | 内部パス（`/getting-started/`）または絶対 URL。 |
| `style` | `'primary' \| 'secondary'?` | 見た目の扱い。                                    |

### `install[]`

ヒーローの CTA の直後、フィーチャーグリッドの前にレンダリングされるコマンド
スニペットです。各スニペットの `code` はドキュメントのコードブロックと同じ
Markdown/shiki パイプラインを通るため、構文ハイライトと、右端に垂直方向で
中央寄せされた右上のアイコン式コピーボタンが付きます。インストールスニペットは
言語ラベルなしでレンダリングされます。他の場所のドキュメントコードブロックは
言語ラベルとテキスト式コピーボタンを保持します。

`title` は、ブロックの上に見出しとしてレンダリングされるのではなく、コードブロック内の
先頭コメント行として折り込まれます（シェル系の言語では `# Install Ovellum globally`、
JS/TS 系の言語では `// …`）。コメントのプレフィックスは `lang` から選ばれます。
コピーボタンはコマンド（`code`）のみをコピーし、折り込まれたタイトルコメントは
決してコピーしません。

| Field   | Type      | 説明                                                                                  |
| ------- | --------- | -------------------------------------------------------------------------------------- |
| `title` | `string`  | コードブロック内の先頭コメントとして表示されます（例: `"Install Ovellum globally"`）。   |
| `code`  | `string`  | コードブロックに表示されるコマンド。                                                |
| `lang`  | `string?` | shiki に渡すハイライト言語。コメントのプレフィックスもこれで選ばれます。デフォルトは `bash`。 |

### `features[]`

| Field         | Type      | 説明                                                                           |
| ------------- | --------- | ------------------------------------------------------------------------------- |
| `icon`        | `string?` | 任意のモノクロインライン SVG または短いテキスト。そのままレンダリングされます。アイコンなしにするには省略します。 |
| `title`       | `string`  | カードのタイトル。                                                                     |
| `description` | `string`  | カードの本文。短い 1 文がもっとも効果的です。                                       |

### `trustStrip`

| Field   | Type                        | 説明                                                        |
| ------- | --------------------------- | ------------------------------------------------------------ |
| `label` | `string?`                   | 任意のセクションラベル（例: `"Trusted by"`、`"Powered by"`）。 |
| `items` | `OvellumLandingTrustItem[]` | 順にレンダリングされます。マージ時にまるごと置き換えられます。              |

### `trustStrip.items[]`

| Field   | Type      | 説明                                                                                                        |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `name`  | `string`  | 表示名（可視テキストとして、また `image` が設定されている場合は `alt` としても使われます）。                                    |
| `href`  | `string?` | 設定すると、その項目はリンクになります。                                                                             |
| `image` | `string?` | `input/` を基準としたパス。ビルドが通過させる静的アセット（`.svg`、`.png`）であるべきです。 |

### 任意の `content/_landing.md`

`site.landing.enabled` が `true` のとき、ビルドは `{input}/_landing.md` を探します。
存在する場合、その本文がフィーチャーグリッドとトラストストリップの間に「Why」
セクションとしてレンダリングされます。アンダースコアのプレフィックスにより通常の
ページ走査から外れるため、サイドバーにも単独の URL としても現れません。

## `update`

CLI の更新チェック — コマンドの完了後に表示される 1 行の「update available」通知 —
を制御します。これはあくまで案内であり、[`ovellum upgrade`](/ja/docs/reference/cli/#ovellum-upgrade)
なしに何かがインストールされることはありません。

```typescript
interface OvellumUpdateConfig {
  check: boolean;
  intervalHours: number;
}
```

| Field           | Type      | Default | 説明                                                                                          |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `check`         | `boolean` | `true`  | npm 上の最新の公開バージョンを調べ、実行中の CLI が古い場合に通知を表示します。 |
| `intervalHours` | `number`  | `24`    | チェックの最小間隔（時間）。結果はキャッシュされるため、ほとんどの実行ではネットワーク I/O は発生しません。            |

このチェックは、`check` の値に関係なく、CI、非対話シェル、`NO_UPDATE_NOTIFIER`
環境変数が設定されている場合、`--no-update-check` が渡された場合には**さらに抑制**
されます。コマンドを遅延させたり失敗させたりすることは決してなく、あらゆるエラー経路
（オフライン、タイムアウト、不正なレスポンス）は静かに握りつぶされます。

## ファイルごとの上書き <a id="per-file-overrides"></a>

任意の `.md` / `.mdx` ファイルのフロントマターで、そのファイルのモードを上書きできます。

```yaml
---
ovellum:
  mode: manual
---
```

`ovellum:` ブロック内で認識されるキー:

| Key             | Type                             | 説明                                |
| --------------- | -------------------------------- | ------------------------------------ |
| `mode`          | `'hybrid' \| 'manual' \| 'auto'` | トップレベルの `mode` と同じ値。 |
| `defaultFormat` | `'md' \| 'mdx'`                  |                                      |

ジェネレーターがすべての自動生成ファイルに書き込む裸の `ovellum: true` マーカーは、
モードの上書きでは**ありません**。パーサーは `ovellum: true`（マーカー）と
`ovellum: { … }`（上書きブロック）を区別します。

## ページごとのフロントマター（manual モード）

**フロントマターは省略可能です。** 先頭に YAML プリアンブルがない `.md` ファイルでも
問題なくビルドされます。Ovellum は本文とファイル名から必要なものを推測します。

| 解決されるフィールド             | フロントマターのキー | フォールバック 1                  | フォールバック 2                    | フォールバック 3 |
| -------------------------- | --------------- | --------------------------- | ----------------------------- | ---------- |
| サイドバーのラベル              | `title:`        | 本文の最初の `# H1`    | タイトルケースにしたファイル名          | `Untitled` |
| ページの `<title>`             | `title:`        | 本文の最初の見出し   | `site.title`                  | —          |
| `<meta name="description">`| `description:`  | —（なければ省略）       | —                             | —          |

したがって実際には:

- ファイルがきれいな `# Heading` で始まるなら **`title:` を省略**できます。
  サイドバーと `<title>` の両方がその H1 を使います。サイドバーのラベルをページ見出しと
  変えたい場合（例: 短いサイドバーラベルと長めのページ見出し）にだけ `title:` を追加します。
- ソーシャルカードや検索結果からリンクされると見込まれるページには **`description:`**
  を追加してください。推測されるフォールバックがなく、このフィールドがないと
  meta タグが省略されるためです。

任意の `.md` ページのフロントマター内で認識されるキー（上記の `ovellum:` 上書きとは
直交します）:

| Key           | Type     | 効果                                                      |
| ------------- | -------- | ----------------------------------------------------------- |
| `title`       | `string` | サイドバーのラベル、`<title>`、ページ見出しのソースを設定します。 |
| `description` | `string` | `<meta name="description">` を設定します。                           |

## `_meta.json`（ディレクトリごと、manual モード）

`input/` の任意のサブディレクトリに置いて、サイドバーのグループ化を制御します。

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

| Field   | Type        | 効果                                                                                                                                          |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | `string?`   | ディレクトリグループの表示タイトル。ディレクトリの `index.md` の H1、次にディレクトリ名にフォールバックします。                                    |
| `order` | `string[]?` | 表示順を指定するスラッグ（ファイルの basename またはサブディレクトリ名）。列挙されていないものは、明示的な集合の後にアルファベット順で並びます。 |

## 検証

すべての読み込みは `validateUserConfig()` を通ります。不正なフィールドは、その悪い
フィールド名を示すパス付きのメッセージとともに `ConfigError` をスローし、CLI は
コード **3** で終了します。

検証される項目:

- すべてのフィールドの型。
- 列挙値（`mode`、`defaultFormat`、`orphanStrategy`、`site.defaultTheme`、
  `site.landing.hero.ctas[].style`）。
- `include` / `exclude` の文字列配列。
- `protect.orphanRetention >= 0` かつ有限であること。
- ランディングページのサブオブジェクトの必須フィールド（`hero.ctas[].label`、
  `features[].title`、`install[].title`、`install[].code` など）。

バリデーターはパスのファイルシステム上の存在は**確認しません**。それは必要なら
後のビルドで表面化します。
