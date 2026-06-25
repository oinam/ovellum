---
title: デプロイ
description: 一度ビルドすれば自己完結した dist/ フォルダができあがり、あとはどこにでもホストできます — セルフホスト、GitHub Pages、Cloudflare、または任意の静的ホスト。
sourceHash: '468695df438296c3'
---

# デプロイ

`ovellum build` は自己完結した `dist/` ディレクトリ — HTML + CSS + 約 2KB の JavaScript — を生成します。サーバーも、データベースも、ランタイムもありません。静的ファイルを配信できるものなら何でもこれを配信できます。

つまり「デプロイ」とは、実のところ「`dist/` をホストに届ける」だけのことです。このページでは一般的な方法を、シンプルなものから順に説明します。あなたのコードがすでに置かれている場所に合うものを選んでください。

## 選択肢の一覧

- **[セルフホスト](#セルフホスト)** — ローカルでビルドし、`dist/` を任意の静的ホスト（Nginx、Apache、S3、VPS、あるいはちょっと確認するための `serve`）にコピーします。
- **[GitHub Pages](#github-pages)** — 2 つのルート: CI ワークフロー、またはローカルからの `gh-pages` プッシュ。
- **[Cloudflare（Pages / Workers）](#cloudflarepages--workers)** — リポジトリを接続すると、Cloudflare がプッシュのたびにビルドしてデプロイします。
- **[その他のプラットフォーム](#その他のプラットフォーム)** — GitLab Pages、Netlify、Vercel など。同じパターンで、設定ファイルが違うだけです。
- **[別ビルドへの埋め込み](#別プロジェクトのビルドへの埋め込み)** — 既にドキュメントを配信するアプリ / モノレポ / SSG へ、CLI またはプログラマティック API でドキュメントを出力します。

---

## セルフホスト

ベースラインであり、デフォルト: ビルドして、フォルダを静的ファイルを配信する場所に置くだけ。

```bash
ovellum build      # writes ./dist
```

そして:

- **任意の Web サーバー（Nginx、Apache、Caddy）:** ドキュメントルートを `dist/` に向けます。
- **オブジェクトストレージ（S3、R2、GCS）:** `dist/` の*中身*をバケットにアップロードし、静的サイト配信を有効にします。
- **ちょっとローカルで確認:** `npx serve dist`。

プリティ URL（`<slug>/index.html`）はリライトルールなしで動作します — `/guides/` へのリクエストは `/guides/index.html` を配信し、これはどの静的サーバーもデフォルトで行います。ビルドは `dist/404.html` も書き出します。ホストが not-found ページに対応しているなら、それを設定してください。

### 出力フォルダを選ぶ

`ovellum build` はデフォルトで `./dist` に書き込みます。ホストが別のフォルダを期待する場合（`public/` を期待するものもあります）、`output` を設定します。

```json
{
  "output": "./public"
}
```

Ovellum の中で「dist」をハードコードしている箇所はありません。

### 出荷前に検証する

```bash
ovellum build
npx serve dist
```

表示された URL を開き、あちこちクリックし、テーマを切り替え、存在しないパスにアクセスして 404 を確認します。ローカルで動くなら、ホスト上でも動きます。

---

## GitHub Pages

すでに GitHub にあるプロジェクト向け。2 つのルート — どちらか 1 つを選びます。

### ルート A — GitHub Actions（推奨）

ワークフローが `main` へのプッシュのたびにビルドし、その結果を公開します。ローカルビルドも、追加のブランチも不要です。これがあなたが今読んでいるサイトを公開しているものです。動作するコピーが [`/.github/workflows/deploy-website.yml`](https://github.com/oinam/ovellum/blob/main/.github/workflows/deploy-website.yml) にあります。

その形は次のとおりです。

```yaml
name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec ovellum build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

そして **Settings → Pages → Source** を **GitHub Actions** に設定し、`main` にプッシュすれば、あとはワークフローが処理します。（pnpm の代わりに npm を使う？ `pnpm/action-setup` のステップを `setup-node` の `cache: npm` に差し替え、`npm ci` + `npx ovellum build` を実行します。）

### ルート B — ローカルビルド + `gh-pages` ブランチ

CI なし。ローカルでビルドし、[`gh-pages`](https://www.npmjs.com/package/gh-pages) ヘルパーで `dist/` を `gh-pages` ブランチに公開します。

```bash
ovellum build
npx gh-pages -d dist --dotfiles
```

- `-d dist` はビルド出力を公開します。
- `--dotfiles` は `CNAME` や `.nojekyll` のようなドットファイルを含めます。

そして **Settings → Pages → Source** を **Deploy from a branch**、ブランチ **`gh-pages`**、フォルダ **`/ (root)`** に設定します。

このルートについて 2 つの注意点:

- **`.nojekyll` ファイルを追加する。** ブランチベースの Pages は出力を Jekyll に通すため、`_` で始まるファイルやフォルダが無視されます。空の `.nojekyll` を `input/` ディレクトリに置けば、Ovellum がそれを `dist/` に通過させ、Jekyll は邪魔をしなくなります。（ルート A ではこれは不要です。Jekyll を通さずにアーティファクトを直接配信するためです。）
- **1 コマンドにする。** `package.json` にスクリプトを追加します: `"deploy": "ovellum build && gh-pages -d dist --dotfiles"`。あとは公開したいときに `npm run deploy` です。

### カスタムドメイン

`input/` ディレクトリの中に、あなたが管理するホスト名を 1 行だけ書いた `CNAME` ファイルを置きます。

```
docs.example.com
```

Ovellum は `.md` 以外のファイルをそのまま通過させるので、`CNAME` は `dist/CNAME` に着地し、Pages が自動的に拾います。あとは DNS を GitHub Pages に向けます。正確な手順は DNS プロバイダーによりますが、Cloudflare が圧倒的に一般的で、これには注意すべき分かりにくい落とし穴が 1 つあります。

#### Cloudflare 経由の DNS（一般的なケース）

1. Cloudflare の DNS パネルで、レコードを追加します:
   - **Type**: `CNAME`
   - **Name**: カスタムドメインのサブドメイン部分
     （例: `docs.example.com` なら `docs`、`ovellum.oss.oinam.com` なら `ovellum.oss`）
   - **Target**: `<your-user>.github.io`（プロトコルなし、パスなし、末尾のドットなし）
   - **Proxy status**: **DNS only（グレーの雲）。** これが落とし穴です。

2. GitHub リポジトリの **Settings → Pages** で、次を確認します:
   - **Source** が「GitHub Actions」（ルート A）または `gh-pages` ブランチ（ルート B）であること。
   - **Custom domain** フィールドに `CNAME` ファイルの値が表示されていること。GitHub は最初のデプロイで `dist/CNAME` からそれを拾います。

3. 数分待ちます。DNS が GitHub のサーバーに解決されると、GitHub Pages はカスタムドメイン用の Let's Encrypt 証明書を自動的に発行します。**Enforce HTTPS** が利用可能になるまで Pages 設定ページを更新し、利用可能になったらチェックを入れます。

これで完了です — `https://docs.example.com/` が HTTPS であなたのサイトを配信するようになりました。

#### なぜグレーの雲（DNS-only）なのか？

Cloudflare のプロキシがオン（オレンジの雲）のとき、Cloudflare は SSL 自体を終端し、GitHub Pages の証明書を発行するために Let's Encrypt が送る HTTP-01 チャレンジに自分で応答してしまいます。チャレンジが GitHub に届かず、証明書が発行されず、Pages はそのまま素の github.io URL を配信します。グレーの雲（DNS-only）は Cloudflare のプロキシをバイパスするので、チャレンジが GitHub に直接届きます。

証明書が発行された後なら、あとでオレンジの雲（プロキシオン）に**切り替えても構いません**。そうする場合は:

- Cloudflare の **SSL/TLS モード**を **Full (strict)** に設定します — それ未満だと、Cloudflare が平文を配信したり、下流で無効な証明書について警告したりする恐れがあります。
- GitHub が発行した証明書を無効にしないでください。GitHub Pages はそれを再発行し続けます。訪問者に配信されるのは Cloudflare のエッジ証明書です。

ほとんどのドキュメントサイトでは、グレーの雲で十分です。GitHub Pages はすでに CDN 上にあり、Cloudflare のプロキシ機能はドキュメント用サブドメインには通常オーバースペックです。

#### その他のプロバイダー経由の DNS

考え方は同じで、UI が違うだけです。

- **Namecheap / GoDaddy / Route 53 など** — サブドメインから `<your-user>.github.io` への CNAME レコードを追加します。プロキシの懸念はありません。
- **Apex ドメイン（`docs.example.com` ではなく `example.com`）** — ほとんどのプロバイダーは apex での CNAME を許可しません。代わりに GitHub Pages の IP を指す 4 つの A レコードを使います。現在の IP リストについては [GitHub のドキュメント](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)を参照してください。

#### カスタムドメインなしの場合

サイトは `https://<user>.github.io/<repo>/` から配信されます — サブパスに注意してください。`site.basePath` を設定しないと内部リンクが壊れます。[サブパス下でのホスティング](#サブパス下でのホスティング)を参照してください。

---

## Cloudflare（Pages / Workers）

あなたのコードが GitHub（または Cloudflare が接続できる任意の git ホスト）にあることを前提とします。Cloudflare はリポジトリを監視し、プッシュのたびにリビルドします — あなたがビルドを実行したり何かをアップロードしたりすることはありません。

1. Cloudflare ダッシュボード → **Workers & Pages → Create → Pages → Connect to Git**。
2. リポジトリとプロダクションブランチ（`main`）を選びます。
3. ビルド設定:
   - **Build command:** `npx ovellum build`
   - **Build output directory:** `dist`
   - **Root directory:** 空のままにするか、サイトがモノレポの中にある場合はサブフォルダ（例: `website`）に設定します。
4. 保存。Cloudflare がビルドしてデプロイし、以降のプッシュは自動的に再デプロイされます。

Cloudflare の CDN がキャッシュと TLS を処理します。Pages と新しい Workers の静的アセットホスティングは同じ「接続してビルド」のフローを共有します — どちらでも動作しますが、ドキュメントサイトには Pages が最もシンプルです。

> [!NOTE]
> Cloudflare にビルドさせるのではなく、自分でビルド済みフォルダをプッシュしたい？ Wrangler を使います: `npx wrangler pages deploy dist`。上記の git 接続フローが一般的なケースで、ローカルツールは不要です。

---

## その他のプラットフォーム

ほかのすべての静的ホストは同じ形に従います: **ビルドコマンド `npx ovellum build`、出力ディレクトリ `dist`。** ホストにこの 2 つを指定すれば動作します。いくつか具体例を挙げます。

### GitLab Pages

`.gitlab-ci.yml` をコミットします。GitLab Pages は `pages` という名前のジョブのアーティファクトを配信し、それが `public/` フォルダにあることを期待します — なのでビルド出力をそこに移動します。

```yaml
pages:
  image: node:20
  script:
    - npx ovellum build
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

GitLab は結果を `https://<group>.gitlab.io/<project>/` で配信します — これはサブパスなので、カスタムドメインを追加しない限り `site.basePath`（下記参照）を設定します。

### Netlify

```bash
npx netlify deploy --prod --dir=dist
```

または `netlify.toml` をコミットします:

```toml
[build]
  command = "npx ovellum build"
  publish = "dist"
```

### Vercel

```bash
npx vercel --prod dist
```

または `vercel.json`:

```json
{
  "buildCommand": "npx ovellum build",
  "outputDirectory": "dist",
  "framework": null
}
```

### それ以外のもの

Render、Surge、Fly static、社内 CDN — レシピは変わりません。ホストが git からビルドするなら、ビルドコマンド（`npx ovellum build`）と出力ディレクトリ（`dist`）を渡します。そうでないなら、ローカルで `ovellum build` を実行して `dist/` をアップロードします。

---

## 別プロジェクトのビルドへの埋め込み

Ovellum はデプロイしません — **ポータブルなフォルダ**をビルドするだけです。ですから
ドキュメントがアプリ（フレームワークサイト、モノレポ、別の静的サイトジェネレーター）と
並んで存在するときは、Ovellum をホストに組み込むのではなく、その出力をホストの配信
ディレクトリに向け、ホストの既存パイプラインに配信させます。

**ビルドをホストのフォルダに向ける。** 永続的な構成の自然な置き場所として、
`ovellum.config.*` で `output`（サブパス下なら `site.basePath` も）を設定します:

```ts
// docs/ovellum.config.ts
export default {
  mode: 'manual',
  output: '../app/public/docs', // ホストが既に配信するフォルダ
  site: { basePath: '/docs' },
} satisfies OvellumUserConfig;
```

そしてホストのスクリプトに連結します（ホストが `public/` をバンドルする前に存在するよう、
ドキュメントを先に）:

```jsonc
// app/package.json
{
  "scripts": {
    "build": "ovellum build --cwd ../docs && vite build",
    "dev": "concurrently \"ovellum watch --cwd ../docs\" \"vite\""
  }
}
```

`ovellum watch` は（auto/hybrid で）インクリメンタルに再ビルドし、ホストの開発サーバーが
書き込まれたファイルを拾ってリフレッシュします。設定を編集せずに一回だけ上書きするなら、
`ovellum build --out <dir> --base <path>` が同じことを呼び出しごとに行います。

**またはプロセス内で動かす。** より密な統合（Vite プラグイン、独自の開発サーバー、
Turborepo タスク）には、起動する代わりに
[プログラマティック API](/ja/docs/guides/automation/#プログラマティック-api)を
インポートします:

```ts
import { build, watch } from 'ovellum';

// ビルドステップで
await build({ cwd: 'docs', out: 'app/public/docs', base: '/docs' });

// 開発サーバーで
const watcher = await watch({ cwd: 'docs', onBuild: () => server.reload() });
```

### 変更分だけを同期（マニフェスト）

S3/CDN へのアップロードには、`ovellum build --manifest` が
`<output>/.ovellum/manifest.json` を書き出します — 各ファイルのパス・バイト数・sha256
付きです。デプロイスクリプトはこれをライブと差分し、ツリー全体を再アップロードする代わりに
変更されたハッシュだけをプッシュ（かつ完全性を検証）できます。

---

## サブパス下でのホスティング

サイトがオリジンのルートに置かれない 3 つのケース:

1. **既存サイトの一部としてのドキュメント** — 例: `example.com/docs/`。
2. **カスタムドメインなしの GitHub Pages** — `<user>.github.io/<repo>/`。
3. **カスタムドメインなしの GitLab Pages** — `<group>.gitlab.io/<project>/`。

どれも同じ修正が必要です: Ovellum にサブパスを伝え、すべての内部リンク、アセット URL、canonical、サイトマップのエントリにプレフィックスを付けられるようにします。`site.basePath` を設定します。

```json
{
  "site": {
    "basePath": "/docs",
    "baseUrl": "https://example.com"
  }
}
```

ルール:

- 先頭にスラッシュ、末尾にスラッシュなし。`/docs` ✓、`docs` ✗、`/docs/` ✗。
- 著者はルート相対のリンク（`/getting-started/`、`/reference/config/`）を書き続けます。ビルドがレンダリング時にプレフィックスを追加します。
- デプロイされたサイトは `https://example.com/docs/` で到達できます。
- `baseUrl` はオリジンのみ（パスなし）。パスは `basePath` にあります。

出力で何が変わるか:

```html
<!-- Without basePath -->
<a href="/getting-started/">Getting started</a>
<link rel="stylesheet" href="/assets/ovellum.css">

<!-- With basePath: "/docs" -->
<a href="/docs/getting-started/">Getting started</a>
<link rel="stylesheet" href="/docs/assets/ovellum.css">
```

外部リンク、フラグメントのみのリンク（`#anchor`）、`mailto:` / 絶対 URL はそのまま通過します。

サイトをスタンドアロン（`docs.example.com` など）でホストする場合は、`basePath` を空のままにします — それがデフォルトです。ルート配信のサイトにこれを設定すると、すべてのリンクに誤ってプレフィックスが付いてしまいます。
