---
title: 自動と手動を混在させる（ハイブリッドモード）
description: 1 つのファイル、2 人の著者 — 両者を共存させるマージエンジン。
sourceHash: '9ee24a89668c1618'
---

# 自動と手動を混在させる（ハイブリッドモード）

ハイブリッドモードは Ovellum が存在する理由そのものです。TypeScript または
JavaScript のプロジェクトを指定すると、ソースから Markdown のリファレンスドキュメントを
生成します。そしてリビルドのたびに、生成されたドキュメントを `docs/` フォルダに
すでにある手書きの文章とマージします。タグ付けされている限り、あなたのものが
上書きされることはありません。

## セットアップ

```json
{
  "mode": "hybrid",
  "input": "./src",
  "output": "./docs",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

最初のビルドを実行して `docs/` を生成します:

```bash
npx ovellum build
```

各 `src/<path>.ts` は、フロントマターとエクスポートされたシンボルごとのセクションを
持つ `docs/<path>.md` を生成します。

## 手書きのコンテンツを追加する

生成されたファイルの 1 つを開きます。次のようなアンカーコメントが見えるはずです:

```markdown
<!-- ovellum:anchor id="src/utils/format.ts::padZero" generated="..." -->

## padZero

\`\`\`typescript
function padZero(value: number, width: number): string
\`\`\`

Pads a number with leading zeros up to `width`.

**Parameters**

| Name  | Type   | Description        |
| ----- | ------ | ------------------ |
| value | number | The number to pad. |
| width | number | Target width.      |

**Returns** `string` - The padded string.
```

セクションのどこにでも[保護ゾーン](/ja/docs/concepts/anchors-and-zones/)を置けます:

```markdown
<!-- @manual:start id="padZero-rationale" -->

**Author's note.** We use `String#padStart` here because V8 intrinsifies
it; the manual loop version showed up in flamegraphs.

<!-- @manual:end -->
```

リビルド:

```bash
npx ovellum build
```

サマリーが何が起きたかを教えてくれます:

```
ovellum build complete in 207ms
  mode:      hybrid
  sources:   12
  written:   12 file(s)
  merged:    3 file(s)   ← files where a manual block was spliced
  orphans:   0
```

もう一度ファイルを開いてみてください — 周囲の自動生成セクションがゼロから再生成された
にもかかわらず、あなたのブロックは置いたとおりの場所にそのまま残っています。

## ソースが変更されたときに何が起きるか

### 新しいシンボル

ソースに関数を追加すると、次のビルドで、対応するドキュメントファイルに新しい自動生成
セクションが現れます。手動ブロックには影響しません。

### リネームされたシンボル

`padZero` を `padWithZeros` にリネームしたとします。自動生成セクションは新しいアンカー
ID（`src/utils/format.ts::padWithZeros`）をキーにするようになりました。あなたの
`padZero-rationale` ブロックは古いアンカーに紐付いていたため、もはや行き場がありません。

Ovellum はそれを `.ovellum/orphans/2026-05-15_src-format.ts-padZero.md` に
[隔離](/ja/docs/concepts/orphans/)し、サマリーで知らせます:

```
ovellum build complete in 198ms
  ...
  orphans:   1
  quarantined:
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

孤立ファイルを開き、その本文をリネームした関数のセクションの下の新しい手動ゾーンに
コピーし、孤立ファイルを削除します。

### 削除されたシンボル

リネームと同じです — 孤立ブロックは `.ovellum/orphans/` に送られます。その文章が
まだ何かに当てはまるかを判断し、別の場所に再び結び付けるか、孤立ファイルを
削除します。

## ハイブリッドのページがどうレンダリングされるか

パイプライン:

1. **解析**: `@ovellum/parser` が TypeScript / JavaScript のソースを走査し、
   `DocProject` — エクスポートされたすべてのシンボルとその JSDoc の中間表現 — を
   生成します。
2. **生成**: `@ovellum/generator` が IR を Markdown にレンダリングします。ソース
   ファイルごとに 1 ファイルで、すべてのセクションにアンカーコメントが付きます。
3. **既存出力の読み取り**: 各出力パスについて、ファイルがすでに存在すれば、
   `@ovellum/reader` がその保護ゾーンを抽出します。
4. **マージ**: `@ovellum/merger` が、新たに生成されたコンテンツに、アンカー ID を
   キーとして保護ゾーンをつなぎ戻します。残ったものは → 孤立ブロックです。
5. **書き込み**: 最終的にマージされたコンテンツがディスクに書き込まれ、孤立ブロックは
   `.ovellum/orphans/` に送られます。

ステップ 1〜2 は、ステップ 3〜4 が存在することを気にしません。`mode` が `auto` なら、
パイプラインはステップ 2 の後で止まります。だからこそ、同じ `parser` + `generator` が
両方のモードを動かせるのです。

## 典型的なハイブリッドプロジェクト

```
my-project/
  src/
    index.ts
    utils/
      format.ts
      validate.ts
  docs/
    index.md            (with handwritten intro + auto-gen API)
    utils/
      format.md         (with handwritten "rationale" zones)
      validate.md
  ovellum.config.json
  .ovellum/
    orphans/            (committed; reviewable in PRs)
```

`docs/` は読者が目にするものです。`.ovellum/orphans/` はあなたのセーフティネットです。

## ハイブリッドモードがしないこと

- **HTML を直接生成しません。** ハイブリッドの出力は Markdown です。
  [別の設定での `manual` モード](/ja/docs/guides/deploy/#self-hosted)と組み合わせるか、
  Markdown を読む任意の静的サイトビルダーに出力を渡してください。
- **ファイルをまたいでマージしません。** 各出力ファイルは独立してマージされます。
  関数を別のソースファイルに移動し、それに応じてアンカー ID が変わると、マージは
  その文章を孤立させます。
- **3 方向マージを試みません。** 契約はバイナリです — 自動所有か人間所有のどちらかで、
  中間はありません。シンプルなモデルで、予期しない競合が少なくなります。
