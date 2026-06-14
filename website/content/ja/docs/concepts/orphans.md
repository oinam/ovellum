---
title: 孤立ブロック
description: ドキュメント化していたシンボルが消えたとき、あなたの文章に何が起こるか。
sourceHash: 'df4e2e7d645bb803'
---

# 孤立ブロック

自動生成と手書きのドキュメントを混在させるうえで最も難しいのは、書くことではありません。
コードが動いたときに何が起こるか、です。

関数をリネームしたり、クラスを削除したり、モジュールを再構成したりすると、自動生成
されたドキュメントはそれに追従します。ビルドのたびにゼロから再生成されるからです。
しかし、コードの古い形に紐づけていた手書きのメモはどうなるでしょうか。多くのツールは、
それらを黙って上書きするか、次のビルドが通る前にすべてのブロックを自分で探し出して
移行するよう求めてきます。

Ovellum はあなたの文章を **価値あるもの** として扱います。次回のビルドで
[保護ゾーン](/ja/docs/concepts/anchors-and-zones/)の置き場所を見つけられない場合、
そのブロックは捨てられません。**隔離** されます。

## 隔離はどのようなものか

マージエンジンは、アンカーが新しい IR にもう存在しない保護ゾーンを見つけると、その
ゾーンを `.ovellum/orphans/` 以下のファイルに書き出します:

```
.ovellum/orphans/
  2026-05-15_src-format.ts-padZero.md
  2026-05-13_src-User.ts-User.constructor.md
```

各ファイルには、完全な来歴を示すフロントマターが付きます:

```yaml
---
orphaned: 2026-05-15T14:32:17.493Z
source_file: docs/utils/format.md
anchor_id: src/utils/format.ts::padZero
manual_block_id: rationale
---

**Note.** We use `String#padStart` here instead of a manual loop because
V8 intrinsifies it and the manual version showed up in flamegraphs.
```

孤立ブロックはビルドのサマリーにも表示されます:

```
ovellum build complete in 219ms
  ...
  orphans:   1
  quarantined:
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

## 孤立ブロックをどうするか

孤立ファイルを確認したら、3つの選択肢があります:

### 1. 新しいアンカーに付け直す

シンボルはリネームされ、その文章はまだ役立ちます。孤立ファイルを開き、本文を新しい
シンボルの Markdown セクションに `<!-- @manual:start -->` ブロックとしてコピーし、
孤立ファイルを削除します。

将来の `ovellum orphans` サブコマンドが、このプロンプトを1つずつ自動化します。
今のところはコピー＆ペーストの手順です。

### 2. 削除する

シンボルが本当に消えたのです。そのメモはもうどこにも当てはまりません。孤立ファイルを
削除してください。もし後で必要になっても、Git の履歴に記録が残ります。

### 3. そのままにしておく

現在の置き場所がなくても、文脈のためにメモを残しておきたいことがあります。削除された
コードパスについてのポストモーテムや、非推奨になった API についての設計メモなどです。
孤立ファイルはそのままにしておいてください。他のファイルと同じようにコミットします。

## なぜ `.ovellum/orphans/` をコミットするのか

これは意図的なものです。孤立ファイルは Markdown — 人間が読め、差分が取れ、PR で
レビューできます。コミットすることには次の意味があります:

- PR をレビューするチームメイトが、あなたが関数を削除したことに気づくと同時に、
  孤立した文章にも気づけます。
- ライブのシンボルにもう紐づいていない過去のメモを、リポジトリ内で grep できます。
- 復元は `git mv` ひとつで済みます。

孤立ブロックを一時的なものとして扱いたい場合は、
[`protect.orphanStrategy`](/ja/docs/reference/config/#protect) を `'warn'` に
設定してください。ビルドは警告を表示しますが、ファイルは書き出しません。

## 孤立ブロックが積み重なったとき

各孤立ファイルには `orphaned:` のタイムスタンプが付いています。将来の
`ovellum orphans --stale` サブコマンドが、
[`protect.orphanRetention`](/ja/docs/reference/config/#protect) 日（デフォルトは
`90`）より古いエントリにフラグを立て、四半期ごとのレビューと、もう関連性のないものの
剪定を簡単にします。

そのサブコマンドが登場するまでは、同じことを手作業でも行えます:

```bash
# 90 日より古い孤立ブロック
find .ovellum/orphans -name '*.md' -mtime +90 -print
```
