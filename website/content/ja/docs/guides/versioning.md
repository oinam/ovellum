---
title: バージョン管理されたドキュメント
description: v1、v2、next を並べて公開する — バージョンごとのディレクトリと、トップバーのバージョンピッカー。
tags: [versioning, versions, releases]
sourceHash: '4c63519af8d8ec88'
---

# バージョン管理されたドキュメント

メジャーバージョンを保守するライブラリは、ドキュメントもそれに合わせる必要があります。
`v1` を読んでいる読者には、今の `main` の姿ではなく `v1` の API が見えるべきです。
Ovellum はドキュメントを**ディレクトリ**でバージョン分けし — 各バージョンが独自の
コンテンツサブツリーになります — トップバーにバージョンピッカーを追加します。これは
**オプトイン**です。バージョンなしのサイトには `content/<id>/` フォルダは不要で、
これまでどおりに動作します。

## 有効にする

[`site.versions`](/ja/docs/reference/config/#versions) でバージョンを宣言し、
各バージョンのコンテンツを `content/<id>/` フォルダに移動します。

```ts
export default {
  site: {
    versions: [
      { id: 'v2', label: 'v2 (latest)', latest: true }, // / で配信
      { id: 'v1', label: 'v1' },                         // /v1/ で配信
    ],
  },
} satisfies OvellumUserConfig;
```

```
content/
  v2/                ← 最新、ルートで配信
    index.md
    guides/install.md
  v1/                ← /v1/ で配信
    index.md
    guides/install.md
```

- **`id`** は URL セグメントであり、フォルダ名（`content/v2/`）でもあります。
- **`label`** はピッカーに表示される名前です。デフォルトは `id`。
- **`latest`** はプレフィックスなしの**ルート**（`/`）で配信されるバージョンを示します。
  指定できるのは最大 1 つで、なければ最初のエントリが採用されます。

最初のビルドで各サブツリーが読み込まれ、最新バージョンはルートに、その他はその id の
配下に出力されます。

```
dist/
  index.html                  ← v2 のホーム
  guides/install/index.html   ← v2
  v1/index.html               ← v1 のホーム
  v1/guides/install/index.html
```

## バージョンピッカー

2 つ以上のバージョンがあると、トップバーにピッカーが現れます（言語ピッカーがあれば
その隣）。バージョンを切り替えると、読者は対象バージョンの**同じページ**に移動し
（`/guides/install/` の v2 は `/v1/guides/install/` へジャンプ）、そのページが存在
しない場合はそのバージョンのホームにフォールバックします。だからバージョン間で
ページを追加・削除しても、リンク切れは生まれません。

## 新しいバージョンを切る

バージョン管理は単なるフォルダなので、新しいメジャーのリリースはコピーと設定編集だけです。

1. 現在の最新を凍結フォルダにコピーします: `cp -r content/v2 content/v1`
   （これで `v1` がスナップショットになります）。
2. ライブの最新として `content/v2` を編集し続けます。
3. `site.versions` に新しいエントリを追加します。

古いバージョンはただのコンテンツです — 編集しないことで凍結しても、パッチを当て続けても、
どちらでも構いません。

## 複数言語との併用

バージョンは [i18n](/ja/docs/guides/i18n/) と組み合わせられます。両方を設定すると、
ロケールは各バージョンの**内側**にネストします。

```
content/
  v2/
    en-US/docs/install.md   → /docs/install/
    ja/docs/install.md      → /ja/docs/install/
  v1/
    en-US/docs/install.md   → /v1/docs/install/
    ja/docs/install.md      → /v1/ja/docs/install/
```

言語ピッカーは現在のバージョン内でロケールを切り替え、バージョンピッカーは現在の
ロケール内でバージョンを切り替えます。`hreflang` の alternate はバージョン内に
留まります。

## バージョンごとに得られるもの

各バージョンは一人前のサイトです。独自のサイドバーナビ、`_meta.json` の順序、
フロントマターを持ちます。ビルド成果物もバージョンごとに出力されます — `sitemap.xml`
はすべてを網羅し、RSS と [`llms.txt`](/ja/docs/guides/automation/) はバージョンごとに
書き出されます（最新はルート、古いものはそのプレフィックス配下）。
