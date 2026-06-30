---
title: トラブルシューティング
description: よくあるつまずきの解決 — ゾーンがマージされない、@manual タグの不一致、設定が読み込まれない、アセットパスの不具合、隔離されたプロースの復旧。
sourceHash: '4834bfae3c247f4b'
---

# トラブルシューティング

実際にぶつかる問題を、原因と対処とともに。多くは明確な CLI メッセージとして現れます —
このページはそれぞれが何を意味するかを説明します。

## 保護ゾーンがマージされない

[hybrid モード](/ja/docs/guides/hybrid-mode/)では、手書きのプロースがリビルドを生き延びるのは、
生成されたアンカーに紐付いた **`@manual` ゾーン**の中にある場合だけです:

```markdown
<!-- @manual:start id="src/utils/format.ts::padZero" -->
ここにプロース — 毎回のリビルドでそのまま保持されます。
<!-- @manual:end -->
```

- **`id` がない？** `id="…"` がないと、Ovellum は位置ベースのフォールバックを合成して
  警告します:
  `protected zone "manual-block-1" uses a positional fallback id. Add id="…" on
  the <!-- @manual:start --> tag so the block survives reordering.` ブロックは
  マージされますが、シンボルではなく*位置*に紐付きます — ファイルの並べ替えで
  プロースが別のセクションに移らないよう `id` を追加してください。`id` は
  ジェネレーターが出力するアンカーコメントと一致します:
  `<!-- ovellum:anchor id="src/utils/format.ts::padZero" … -->`（形式は
  `<ソースファイル>::<シンボル>`）。

- **`ovellum check --strict`** は id のないゾーンを `positional-zone`、アンカーが
  もう存在しないゾーンを `stale-anchor` として報告するので、問題になる前に CI で
  両方を捕まえられます。

### `@manual` タグの不一致

これらはハードエラーです（ビルドが[終了コード 3](#終了コード) で停止します）:

| メッセージ | 原因 |
| ------- | ----- |
| `Nested @manual:start tag at line N (previous opened at line M).` | 最初を閉じる前に 2 つ目の `@manual:start`。 |
| `Stray @manual:end at line N: no matching @manual:start.` | 対応する開始のない `@manual:end`。 |
| `Unclosed @manual:start at line N.` | 閉じられていないゾーン — 対応する `<!-- @manual:end -->` を追加。 |

すべての `@manual:start` には対応する `@manual:end` がちょうど 1 つ必要で、ゾーンは
ネストできません。

## リビルド後にプロースが消えた（孤立）

消えていません — **隔離**されただけで、捨てられてはいません。ゾーンが紐付いていた
シンボルがリネーム・削除されるとアンカーが消えるので、マージャーはプロースを失わずに
`.ovellum/orphans/`（`protect.orphanDir`）へ移します。ビルドサマリーは `quarantined:` の下に
`↪ <path>` の行で一覧します。

復旧:

```sh
ovellum orphans                 # 隔離されたプロース + アンカーが戻っているかを一覧
ovellum orphans --stale         # protect.orphanRetention（デフォルト 90 日）より古いものだけ
ovellum orphans --reattach      # 各項目を対話的に再アタッチ／削除／スキップ
```

`ovellum orphans` は各ブロックのソースドキュメント、経過日数、**アンカーの状態**を
表示します — `present again in source — reattachable`、`gone from current source`、
または `unknown (no IR snapshot — run ovellum build)`。状態はビルドが書き出す
`.ovellum/ir.json` スナップショットから読まれるので、*unknown* と出たらまずビルドを
実行してください。

`--reattach` は対話的です（ターミナルで実行してください）。各孤立について、**ソースに
戻った**アンカー（または名前の類似による**リネーム**の候補）への再アタッチ、別のアンカーへの
再アタッチ、削除、スキップを提示します。再アタッチは対象の下に新しい `@manual` ゾーンとして
プロースを差し込み、アーカイブを削除します。リネーム候補を示す相棒は
[`ovellum diff`](/ja/docs/reference/cli/#ovellum-diff) です。

## 設定が使われない

いくつか確認すべき点:

- **場所・名前が違う。** ファイルはプロジェクトルートの
  `ovellum.config.{ts,mts,cts,js,mjs,cjs,json}` でなければなりません（検出は
  [c12](https://github.com/unjs/c12)）。**設定がないことはエラーではありません** —
  Ovellum は組み込みのデフォルトにフォールバックし、ビルドサマリーは
  `config: (defaults)` と表示します。その行が出たらファイルが見つかっていません。
  `--config <path>` で明示的に指定するか、別の場所から実行しているなら
  `--cwd <dir>` を使ってください。

- **不正な設定**はビルドを `config error: …` と[終了コード 3](#終了コード) で
  停止します — 例: `` `mode` must be one of: hybrid, manual, auto. ``。
  メッセージは問題のフィールドを示すので、直してリビルドします。

- **`import { defineConfig } from 'ovellum'` が解決できない。** 値のインポートには、
  設定が読み込まれる場所に `ovellum` パッケージがインストールされている必要があります。
  スキャフォールドされた設定は意図的にそれを避けています —
  `import type { OvellumUserConfig } from 'ovellum'` と
  `export default { … } satisfies OvellumUserConfig` を使い、読み込み時に消去されるので
  ファイルにランタイム依存がありません。`ovellum` をローカルにインストールするか、
  `import type` + `satisfies` の形を使ってください。

## ビルド済みサイトで画像やリンクが壊れている

ほぼ必ず**相対パス**です。ページはきれいな URL になるので
（`guides/install.md` → `/guides/install/`）、相対の `architecture.svg` は、ファイルの
あるフォルダではなく `/guides/install/` に対して解決されます。**ルート絶対パスを
使ってください:**

```markdown
![Architecture](/guides/architecture.svg)   <!-- ✓ 常に解決される -->
![Architecture](architecture.svg)            <!-- ✗ ページ URL に対して解決される -->
```

その他のアセットの落とし穴:

- **`site.basePath`** は `/` で始まり、**末尾のスラッシュはなし**でなければなりません
  （`'/ovellum'`）。レンダリング時にすべての内部リンク + アセットパスの前に付加されるので、
  ルート相対リンクを書き続けられます。不正な値は検証で失敗します:
  `` `site.basePath` must start with `/` … or be the empty string. ``
- **`public/` はサイトルートにマッピングされます** — `public/favicon.ico` →
  `/favicon.ico`。`public/` プレフィックスなしでルートから参照してください。
- **`ovellum check` はページリンクを検証しますが、アセット URL は検証しません。**
  画像やダウンロードはページではなくファイルを指すので、ローカルの `ovellum serve`
  （または `ovellum dev`）で確認してください。[アセット](/ja/docs/guides/assets/)を参照。
- CDN を使う？ [`site.assetBaseUrl`](/ja/docs/guides/assets/#public-を-cdn-から提供する)
  は `public/` の参照を書き換えますが、クエリ文字列付きや `srcset` の URL は**書き換えません** —
  それらは最終的な CDN の URL で参照してください。

## `ovellum dev` が manual モードのみと言う

そのとおりです — `dev` は manual モードのライブプレビューループです。**auto/hybrid** では、
`ovellum watch`（変更ごとに Markdown をリビルド）を実行して出力を自分で配信するか、
単に `ovellum build` を使ってください。メッセージが代替手段を示します。

## 終了コード

コマンド間で安定しているので、CI が分岐に使えます:

| Code | 意味 |
| ---- | ------- |
| `0` | 成功 — ビルド完了、または `check`/`diff` が何も検出しなかった。 |
| `1` | 問題を検出（`check` のリンク切れ、`diff --exit-code` の変更）、またはビルドエラー。 |
| `2` | `ovellum init` — 設定がすでに存在。`--force` で再実行。 |
| `3` | `ConfigError` — 設定が不正、または読み込み失敗。 |
| `130` | 対話プロンプトでキャンセル（Ctrl-C）。 |

`--json` モードでは `ConfigError` は stdout に `{ "ok": false, "error", "hint" }` として
出ます — [自動化](/ja/docs/guides/automation/)を参照。

## それでも詰まったら

コマンドに `--verbose` を付けると、設定解決のパスと各ステージの詳細が出ます（stderr に
出るので `--json` と併用できます）。完全なフラグ一覧は [CLI リファレンス](/ja/docs/reference/cli/)を
参照してください。バグのように見える場合は
[Issue を立ててください](https://github.com/oinam/ovellum/issues)。
