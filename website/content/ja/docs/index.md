---
title: はじめに
description: Ovellum をインストールし、プロジェクトに向けて、最初のドキュメントをビルドする。
---

# はじめに

Ovellum は、TypeScript または JavaScript のプロジェクトにインストールする単一の CLI です。
以下の3つのステップで、ゼロの状態から、任意の静的ホストにデプロイできる
`dist/`（または `docs/`）ディレクトリのビルドまで進められます。

## 1. インストール

既存の TypeScript または JavaScript プロジェクトで:

```bash
npm install --save-dev ovellum
```

`pnpm`、`yarn`、`bun` のいずれを使ってもかまいません。Ovellum はこだわりません。Node.js 20 以降が
必要です。

依存関係を追加したくない場合は、インストールを省略して、代わりに
`npx ovellum <command>` で実行できます。最初の呼び出しでバイナリがダウンロードされ、
以降の実行はパッケージマネージャーによってキャッシュされます。

各パッケージマネージャーの詳細は、[インストールガイド](/ja/docs/install/)を参照してください。

## 2. 設定

プロジェクトのルートに `ovellum.config.json` を作成します:

```json
{
  "mode": "manual",
  "input": "./content",
  "output": "./dist",
  "site": {
    "title": "My docs",
    "defaultTheme": "auto"
  }
}
```

この設定は、Ovellum に `./content/` をたどって `.md` ファイルを探し、
静的サイトを `./dist/` に書き出すように指示します。代わりに TypeScript ソースから
ドキュメントを生成したい場合は `mode` を `auto` に、両方を同じファイル内で混在させたい場合は
`hybrid` に置き換えてください。違いについては [コンセプト → モード](/docs/concepts/modes/) を参照してください。

デフォルトでは、`/` は `content/index.md` をそのままドキュメントレイアウトに描画し、
読者は直接ドキュメントに到達します。代わりに `/` にマーケティング風のホームページを
置きたい場合は、`site.landing.enabled: true` を設定してください。詳しい設定については
[ランディングページ](/docs/guides/manual-mode/#landing) を参照してください。

TypeScript の設定ファイル（`ovellum.config.ts`）も使えます。エクスポートされた
`defineConfig` ヘルパーを通じて、オートコンプリートも得られます:

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'manual',
  input: './content',
  output: './dist',
  site: {
    title: 'My docs',
    defaultTheme: 'auto',
  },
});
```

## 3. ビルド

コンテンツを追加します:

```
content/
  index.md
  getting-started.md
  guides/
    deploy.md
```

そしてビルドします:

```bash
npx ovellum build
```

次のようなサマリーが表示されます:

```
ovellum build complete in 198ms
  config:    .../ovellum.config.json
  mode:      manual
  output:    dist/
  pages:     3
  warnings:  0
    → /                       (dist/index.html)
    → /getting-started/       (dist/getting-started/index.html)
    → /guides/deploy/         (dist/guides/deploy/index.html)
```

`dist/index.html` をブラウザで開くか、フォルダを配信します:

```bash
npx serve dist
```

## 次のステップ

- ドキュメントの上にランディング/マーケティングページが欲しいですか?
  [ランディングを有効化](/docs/guides/manual-mode/#landing)しましょう。
- 自動生成された API ドキュメントと手書きの文章を混在させたいですか?
  [ハイブリッドモード](/docs/guides/hybrid-mode/)を参照してください。
- 公開する準備はできましたか? [デプロイガイド](/docs/guides/deploy/)では、
  GitHub Pages、Netlify、Vercel、そして「`dist/` をどこかにアップロードするだけ」までを解説します。
- リファレンス: [設定フィールド](/docs/reference/config/) と [CLI コマンド](/docs/reference/cli/)。
