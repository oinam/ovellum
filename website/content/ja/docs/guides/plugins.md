---
title: プラグイン
description: プラグインでビルドを拡張する — 設定・ページごとの変換・デプロイロジック（onBuildComplete）のためのライフサイクルフック。
sourceHash: 'bfbc560cdeb23167'
---

# プラグイン

プラグインは、**ビルドのライフサイクルフック**の名前付きユニットです。プラグインは、
デプロイロジック（`onBuildComplete`）、環境からの設定の調整（`onResolveConfig`）、
レンダリング済みページの後処理（`transformPage`）の置き場所です。複数並べれば、各フックは
順番に実行されます。

> プラグインは関数なので、**TS または JS の設定**（`ovellum.config.ts` / `.js`）に
> 置きます — JSON の設定には入れられません。[プログラマティック
> API](/ja/docs/guides/automation/#プログラマティック-api)（`build({ plugins: [...] })`）からも
> 流れます。

## プラグインの宣言

```ts
// ovellum.config.ts
import { defineConfig } from 'ovellum';

export default defineConfig({
  plugins: [
    {
      name: 'deploy-to-cdn',
      onBuildComplete: async ({ outDir, manifest }) => {
        await syncToCdn(outDir, manifest.files); // あなたのデプロイ
      },
    },
  ],
});
```

プラグインは `{ name, ...hooks }` です。`name` はログやエラーメッセージでの識別子です。
各フックは任意で、`async` でも構いません。サードパーティのプラグインは、そのようなオブジェクトを
返す関数にすぎません — `plugins: [myPlugin()]`。

## ライフサイクルフック

フックはこの順序で、各プラグインを配列順にまたいで実行されます。

| フック | タイミング | 受け取るもの | 返すもの |
| ---- | ---- | ---- | ------- |
| `onResolveConfig` | 設定の読み込み + CLI オーバーライド適用後、ビルド前 | 解決済みの `OvellumConfig` | それを**置き換える**設定（連鎖）、または何も返さない |
| `onBuildStart` | 出力前に一度 | `{ config, cwd, mode }` | — |
| `transformPage` | レンダリング済み HTML ページごと（manual モード）、書き込み前 | `{ url, html, outputPath, frontmatter? }` | ページを**置き換える** `{ html }`、または何も返さない |
| `onBuildComplete` | ビルド完了後 | `{ outDir, manifest, cwd, mode }` | — |

フックが例外を投げるとビルドは失敗し、プラグインに帰属するメッセージが出ます —
`[plugin: <name>] <hook> failed: …` — 壊れたプラグインが黙って無視されることはありません。

### `onResolveConfig` — 環境からの設定

```ts
{
  name: 'preview-url',
  onResolveConfig: (config) =>
    process.env.DEPLOY_URL
      ? { ...config, site: { ...config.site, baseUrl: process.env.DEPLOY_URL } }
      : undefined, // 変更なし
}
```

設定を返すと置き換わります（後続のプラグインはあなたのバージョンを見ます）。何も返さなければ
そのままです。CLI オーバーライド（`--out` / `--base`）はフックの**後**に適用されるので、
最も明示的なソースが勝ちます。返された設定はそのまま使われます — 妥当性はあなたの責任です。

### `transformPage` — 各ページの後処理

**manual モード**サイトのレンダリング済み HTML ページ（ランディング、各ドキュメントページ、
404）ごとに、書き込み直前に実行されます。`{ html }` を返すと置き換わります。プラグインは
連鎖するので、各プラグインは前のプラグインの HTML を見ます。

```ts
{
  name: 'inject-banner',
  transformPage: ({ url, html }) => ({
    html: html.replace('<body>', '<body><div class="preview-banner">Preview</div>'),
  }),
}
```

（auto/hybrid の出力はページではなく Markdown なので、`transformPage` は実行されません。）

### `onBuildComplete` — デプロイフック

ビルド後に一度実行されます。`outDir` は出力先の絶対パス、`manifest` は
[デプロイインベントリ](/ja/docs/guides/automation/)（各ファイルのサイズ + sha256）で、
**プラグインがこのフックを定義していれば**`--manifest` なしでも**常に計算される**ので、
デプロイプラグインは常にファイル一覧を持ちます。

```ts
{
  name: 'deploy',
  onBuildComplete: async ({ outDir, manifest }) => {
    // 変更分だけアップロード、完全性を検証、など。
    for (const file of manifest.files) await upload(outDir, file.path, file.sha256);
  },
}
```

これは「Ovellum はビルドし、ホストがデプロイする」という契約を具体化したものです。Ovellum は
完成したフォルダ + インベントリを渡し、あとはあなたのフックが引き継ぎます。

## Markdown プラグイン

プラグインは、Markdown パイプラインを [remark](https://github.com/remarkjs/remark) と
[rehype](https://github.com/rehypejs/rehype) のプラグインで拡張できます。それぞれは
unified の `Pluggable`（プラグイン関数、または `[plugin, options]` のタプル）です。

```ts
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  plugins: [
    { name: 'math', remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
  ],
});
```

`remarkPlugins` は Ovellum の組み込み remark プラグインの後・HTML 変換の前に実行され、
`rehypePlugins` は HTML ツリーに対して実行されます。manual モードのページレンダリング
（ドキュメントページ + ランディングのプロース）に適用されます。

> **セキュリティ:** `rehypePlugins` は**サニタイズの前**に注入されます — Ovellum の
> サニタイズステップが、それらが生成するすべてのものに対するガードなので、プラグインが
> `<script>` などの安全でない HTML を注入することはできません。（rehype プラグインが追加した
> `<script>` は、ページ内の生 HTML と同様に除去されます。）サニタイザーが落とす要素・属性が
> 必要な場合、それはバグではなく意図的な境界です。

## 関連: テーマアセットの置き換え

プラグインは設定・ページごとの HTML・Markdown 拡張・デプロイをカバーします。
カスタマイズのもう半分は **CSS/JS レイヤー**です。

- [`site.css`](/ja/docs/guides/themes/#デフォルトテーマのカスタマイズ) — スタイルシートを
  重ねる（デザイントークンの上書き、ルールの追加）。
- [`site.templateDir`](/ja/docs/guides/themes/#テンプレートディレクトリを持ち込む) — バンドルの
  `ovellum.css` / `ovellum.js` / フォントを丸ごと自分のものに置き換える（フォーク不要）。

ページの **HTML 構造**はコードで生成されます。（CSS/JS を超える）完全なレイアウト／
パーシャルのシステムは、今のところ意図的に対象外です。
