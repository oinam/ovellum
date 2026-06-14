---
title: モード
description: 自動、手動、ハイブリッド — 3つのパイプライン、1つのツール。
---

# モード

Ovellum には、どのパイプラインが実行されるかを決める設定つまみが1つあります:

```json
{
  "mode": "hybrid"
}
```

有効な値は3つあります: `auto`、`manual`、`hybrid`。プロジェクトごとに一度選ぶか、
ディレクトリごと・ファイルごとに上書きします。これらは自由に混在できるよう設計されて
います。リポジトリ全体で1つに固定することを強いられることはありません。

## `auto`

TypeScript / JavaScript のソースから Markdown ドキュメントを生成し、`output/` に
書き出します。既存の出力はビルドのたびに上書きされます。マージステップも、手動の
レイヤーもありません。

```
src/utils/format.ts   →   docs/utils/format.md
src/models/User.ts    →   docs/models/User.md
```

次のようなときに使います:

- 公開すべきものが API リファレンスだけのとき。
- ドキュメントを手で編集する対象ではなく、ビルド成果物として扱っているとき。
- TypeDoc などから移行していて、出力の形は変えつつ同じワークフローを保ちたいとき。

出力はプレーンな Markdown です。`.md` を読めるものなら何でも後処理に使えます。

## `manual`

正反対の端です。Ovellum は Jekyll スタイルの静的サイトビルダーとして振る舞います。
`input/` をたどって `.md` ファイルを探し、デプロイ可能な HTML サイト — サイドバー
ナビゲーション、右側の目次、シンタックスハイライト付きのコード、テーマ — を生成します。
ソースの解析は一切ありません。

```
content/index.md            →   dist/index.html
content/getting-started.md  →   dist/getting-started/index.html
content/guides/deploy.md    →   dist/guides/deploy/index.html
```

次のようなときに使います:

- ドキュメントを手書きしていて、信頼できる唯一の情報源からの生成なしに、きれいな出力が
  ほしいとき。
- ドキュメントと並んでマーケティングサイトやランディングページを構築するとき
  （[`site.landing`](/ja/docs/reference/config/#sitelanding) を有効にすると Material
  for MkDocs 風のホームページになります）。
- コードとは無関係な、純粋に文章のコンテンツをホストするとき。

いまご覧になっているこのサイトは `manual` モードでビルドされています。

## `hybrid`（デフォルト）

ソースから生成し、その後あなたの手書きコンテンツをマージして戻します。あなたの文章は、
自動生成されたリファレンスと同じファイルの中に存在します。Ovellum はタグ付けの
取り決めを尊重します。`<!-- @manual:start -->` と `<!-- @manual:end -->` のあいだに
あるものはあなたのもので、決して触れられません。それ以外のすべては自動生成され、
ビルドのたびに書き換えられる可能性があります。

```
                            ┌──────────────┐
src/utils/format.ts ────►   │  build       │   ────►  docs/utils/format.md
docs/utils/format.md ───►   │  parse + gen │
(existing manual blocks) ►  │  + merge     │
                            └──────────────┘
```

次のようなときに使います:

- 生成によって恩恵を受ける API の表面と、それと並んで存在するナラティブなコンテンツの
  両方を持っているとき。
- ある関数についてのすべて — そのシグネチャ、パラメーター、そして「注意、ここは遅い
  パスです」というチームのメモ — を1か所で見られるようにしたいとき。
- リネームまたは削除されたシンボルが、黙って失われるのではなく、孤立した文章を確認用に
  浮かび上がらせるようにしたいとき。

タグ付けの取り決めは[アンカーとゾーン](/ja/docs/concepts/anchors-and-zones/)で、
孤立ブロックの扱いは[孤立ブロック](/ja/docs/concepts/orphans/)で解説しています。

## ディレクトリごと・ファイルごとの上書き

`mode` フィールドは次の場所にも置けます:

- 任意のサブディレクトリ内のネストした `ovellum.config.*`。衝突時はより深い方が勝ちます。
- 単一ファイルのフロントマター内の `ovellum:` ブロック:

  ```markdown
  ---
  ovellum:
    mode: manual
  ---
  ```

  プロジェクトのデフォルトが `auto` や `hybrid` であっても、そのページは手動コンテンツ
  として扱われます。

上書きの解決の全容は[リファレンス → 設定](/ja/docs/reference/config/#per-file-overrides)
にあります。
