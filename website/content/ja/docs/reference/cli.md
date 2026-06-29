---
title: CLI リファレンス
description: ovellum CLI のすべてのサブコマンドとフラグ。
sourceHash: 'ba5a57cc35894675'
---

# CLI リファレンス

`ovellum <subcommand> [flags]`

`npx ovellum` で実行するか、インストール後にパッケージのバイナリとして実行するか、
あるいはパッケージマネージャーのタスクランナー経由で実行します。

## サブコマンド

| Subcommand | Status    | 概要                                                                  |
| ---------- | --------- | ------------------------------------------------------------------------ |
| `init`     | available | 新しいプロジェクトを生成します（設定 + スターターコンテンツ + `.gitignore` エントリ）。  |
| `build`    | available | 設定済みのパイプラインを実行します（parse + generate + merge、またはサイトのビルド）。 |
| `diff`     | available | 現在のソースを直前のビルドの IR スナップショットと比較し、再ビルドで何が変わるかをプレビューします。 |
| `dev`      | available | ビルド、監視、配信、接続中のブラウザのライブリロードをまとめて実行する、1 コマンドの開発ループです。 |
| `watch`    | available | ビルド後、`input/` 配下の変更ごとに再ビルドします（300 ms のデバウンス付き）。   |
| `serve`    | available | ビルド済みサイトを HTTP で配信します。監視もライブリロードもありません。                |
| `check`    | available | 設定を検証し、リンク切れの内部リンクを確認し、安全でない URL を警告します。    |
| `upgrade`  | available | npm に新しい Ovellum がないか確認し、インストールします。                            |
| `orphans`  | available | 隔離された手動ブロックを一覧表示します（`--stale` / `--json` 対応）。              |
| `mcp`      | available | Ovellum を stdio 上の MCP サーバーとして起動し、AI エージェントから操作できるようにします。 |
| `clean`    | planned   | 手動ファイルを保持したまま、自動生成された出力を削除します。             |

## `ovellum init`

カレント（または指定した）ディレクトリに新しいプロジェクトを生成します。
`--force` を渡さない限り、既存の `ovellum.config.json` を上書きすることはありません。

### 構文

```
ovellum init [--cwd <dir>] [--yes] [--force]
```

### フラグ

| Flag          | Type    | Default         | 説明                                                                                |
| ------------- | ------- | --------------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>` | path    | `process.cwd()` | プロジェクトのルート。                                                                        |
| `--yes`, `-y` | boolean | `false`         | 非対話モード。すべてのデフォルトを受け入れます。CI / スモークテストで便利です。                   |
| `--force`     | boolean | `false`         | 既存の `ovellum.config.json` を上書きします。デフォルトではこのコマンドは `2` で終了します。 |

### プロンプト（対話モード）

1. **Project name** — `package.json#name` またはフォルダ名がデフォルトです。
2. **Mode** — `manual`（デフォルト）、`auto`、または `hybrid`。
3. **Site title** — プロジェクト名をタイトルケースにしたものがデフォルトです。
4. **Description** — `<meta name="description">` に使用されます。
5. （manual）**Content dir** / **Output dir** / **Generate landing page?**
6. （auto / hybrid）**`tsconfig`** / **Output dir**。
7. **Default theme** — `auto`、`light`、または `dark`。

### 出力

すでに存在しないファイルのみを書き込みます（`--force` を指定しない限り）。

- `ovellum.config.json`
- `<input>/index.md`（manual + hybrid モードのみ）。親しみやすいスターター付き。
- `AGENTS.md` — AI コーディングエージェント向けの、モードに応じた指示（保護ゾーンの契約 +
  コマンド）。[自動化](/ja/docs/guides/automation/)を参照。
- `.gitignore` — 未記載の場合に `<output>/` と `.orphans/` を追記します。

選択したモードに応じた番号付きの次のステップ一覧を表示します。

### 終了コード

| Code  | 意味                                                                |
| ----- | ---------------------------------------------------------------------- |
| `0`   | プロジェクトを初期化しました。                                                   |
| `2`   | `ovellum.config.json` がすでに存在します。`--force` で再実行すると置き換えられます。 |
| `130` | ユーザーがプロンプトをキャンセルしました（Ctrl-C）。                                   |

## `ovellum build`

プロジェクトの `ovellum.config.*` を解決し、設定済みのパイプラインを実行し、
出力をディスクに書き込み、サマリーを表示します。

### 構文

```
ovellum build [--cwd <dir>] [--config <path>] [--drafts] [--out <dir>] [--base <path>] [--manifest]
```

### フラグ

| Flag              | Type | Default         | 説明                                                           |
| ----------------- | ---- | --------------- | --------------------------------------------------------------- |
| `--cwd <dir>`     | path | `process.cwd()` | プロジェクトのルート。設定内のすべてのパスはこれを基準に解決されます。 |
| `--config <path>` | path | auto-discovered | 自動検出をスキップし、このファイルを直接読み込みます。                     |
| `--drafts`        | flag | off             | [ドラフト](/ja/docs/guides/drafts/)ページを含めます（通常は本番ビルドから除外されます）。 |
| `--out <dir>`     | path | `output` 設定   | このビルドの**出力ディレクトリを上書き**します。設定を編集せずに CI/デプロイのパイプラインを任意のフォルダ（例: リポジトリの `/docs`）に向けられます。 |
| `--base <path>`   | path | `site.basePath` | サイトを配信する**ベースパスを上書き**します（例: `/docs`）。`site.basePath` と同じ効果を呼び出しごとに与えます。 |
| `--manifest`      | flag | off             | `<output>/.ovellum/manifest.json` を書き出します — ビルドされた全ファイルのハッシュ付きインベントリ（パス・バイト数・sha256）。デプロイツールが変更分だけをプッシュし、完全性を検証できます。 |
| `--json`          | flag | off             | ビルドサマリーを JSON で出力します（CI / ツール向け）。装飾的な出力はありません。[自動化](/ja/docs/guides/automation/)を参照。 |
| `--verbose`       | flag | off             | 設定解決と各ステージ / ファイル I/O の詳細を **stderr** に出力します（stdout は変わらないため `--json` と併用できます）。 |

### モードごとの挙動

#### `auto`

1. `input/` を解析して `DocProject` IR にします。
2. IR を Markdown にレンダリングします。
3. 既存ファイルを上書きしながら各出力を書き込みます。

#### `hybrid`（デフォルト）

`auto` と同じ処理の後、生成された各ファイルについて次を行います。

1. 既存の出力ファイルがあれば読み込みます。
2. `<!-- @manual:start -->` ブロックを含む場合は、マージャーを実行します。
3. アンカーがもう存在しないブロックは `protect.orphanDir` に書き出されます。

#### `manual`

1. `input/` を走査して `.md` ファイルを探します。
2. それぞれを HTML にレンダリングします（Markdown はサニタイズされます。[セキュリティ](/ja/docs/reference/security/)を参照）。
3. サイドバーナビゲーションとパンくずリストを構築します。
4. 各ページをデフォルトテンプレートで囲みます（トップバー、サイドバー、目次、前後リンク、ページメタ）。
5. プリティ URL を `output/` に書き込みます。
6. バンドルされたテンプレートから `assets/ovellum.css` と `assets/ovellum.js` をコピーします。
7. `site.baseUrl` が設定されている場合は `sitemap.xml` と `feed.xml` を出力します。
8. `site.search.enabled` が `true` の場合は、出力に対して Pagefind を実行し `dist/pagefind/` を出力します。
9. [AI フレンドリーな出力](/ja/docs/reference/config/#ai)を出力します — `llms.txt`、各ページの `.md` ミラー（有効なら `llms-full.txt` も）。デフォルトでオン。[`site.ai`](/ja/docs/reference/config/#ai) で制御します。

### サマリー出力

#### Auto / hybrid

```
ovellum build complete in 207ms
  config:    .../ovellum.config.json
  mode:      hybrid
  sources:   2          ← input files parsed
  written:   2 file(s)  ← Markdown files written
  merged:    1 file(s)  ← hybrid only: files where a manual block was spliced
  orphans:   0          ← hybrid only: blocks whose anchor disappeared
  warnings:  0          ← 対処すべき実際の問題（severity "warning"）
  notes:     1          ← 良性の通知（severity "info"）。> 0 のときのみ表示
    → docs/format.md
    → docs/user.md
  quarantined:          ← only printed when orphans > 0
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
  ir:        .ovellum/ir.json   ← parsed IR snapshot, written every auto/hybrid build
```

診断は severity で分けられます。`warnings:` は実際の問題（孤立したコンテンツ、
安全のためスキップされたアセット、解析できない日付）を数え、`notes:` は良性の通知
（ドラフトの除外、`site.baseUrl` 未設定による `sitemap.xml` のスキップ）を数えます。
サマリーの下では、それぞれ `warning:` / `info:` の行として — **実際の問題を先頭に** —
表示されるので、埋もれることはありません。`--json` も同じ `{ message, severity }`
の形を持ちます（[自動化](/ja/docs/guides/automation/)を参照）。

auto/hybrid ビルドは毎回、解析した IR をプロジェクトルートの `.ovellum/ir.json`
（`.ovellum/orphans/` の隣）にも書き出します — 直前に読み取ったシンボル・アンカー・
シグネチャのスナップショットです。これはデプロイ成果物ではなくビルド _状態_ なので、
`--out` に関係なくプロジェクトルートに残り、`.ovellum/` はデフォルトの雛形で gitignore
されています。今後のソース差分・リネーム検出・アンカーの最終確認追跡の基盤であり、
API サーフェスの構造化ビューを必要とするツールから自分で読み取ることもできます。

#### Manual

```
ovellum build complete in 207ms
  config:    .../ovellum.config.json
  mode:      manual
  output:    dist/
  pages:     5
  warnings:  0
    → /                       (dist/index.html)
    → /configuration/         (dist/configuration/index.html)
    → /getting-started/       (dist/getting-started/index.html)
    → /guides/deploying/      (dist/guides/deploying/index.html)
    → /guides/theming/        (dist/guides/theming/index.html)
  manifest:  dist/.ovellum/manifest.json   ← --manifest 指定時のみ
```

### 終了コード

| Code | 意味                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | 成功。                                                    |
| `1`  | ビルドエラー（パーサーの失敗、書き込み失敗、不明なモード）。  |
| `2`  | `--strict` 用に予約（警告がエラーに格上げされた場合）。      |
| `3`  | `ConfigError` — 設定スキーマが不正、ファイルが見つからない、など。 |

`stderr` には警告ごとの行（`warning: …`）が出力されます。`stdout` にはサマリーが出力されます。

### 例

```bash
# Build from the current directory
npx ovellum build

# Build a different project
npx ovellum build --cwd ./website

# Bypass config discovery
npx ovellum build --config ./config/ovellum.prod.ts

# Deploy-anywhere: build into a repo's /docs folder with a deploy manifest
npx ovellum build --out ./docs --base /docs --manifest
```

## `ovellum diff`

**現在のソース**を、直前のビルドが書き出した IR スナップショット
（`.ovellum/ir.json`）と比較し、再ビルドで何が変わるか — 追加・削除・変更された
シンボルと、それらが触れる出力ドキュメント — を報告します。何も書き込みません。
ビルドではなくプレビューです。auto/hybrid 専用です（manual ビルドはソースを解析せず
IR を持ちません）。

シンボルは安定したアンカー id で照合します。アンカーが消え、似たシンボル（同じ種別・
似た名前・同じシグネチャ形状）が現れた場合、その 2 つは無関係な削除＋追加ではなく
**リネームの可能性が高い**ペアとして扱われます — リファクタリング後に対応すべき提案です。
行番号がずれるだけの表面的な編集は無視され、ドキュメント化された面（シグネチャ・引数・
戻り値・説明・非推奨・JSDoc タグ・エクスポート/可視性）が実際に異なるときだけ変更として
報告されます。

### 構文

```
ovellum diff [--cwd <dir>] [--config <path>] [--json] [--exit-code]
```

### フラグ

| Flag           | Type    | Default         | 説明                                                                       |
| -------------- | ------- | --------------- | --------------------------------------------------------------------------- |
| `--cwd <dir>`  | path    | `process.cwd()` | プロジェクトのルート。                                                               |
| `--config <path>` | path | auto-discovered | 自動検出をスキップし、このファイルを直接読み込みます。                                 |
| `--json`       | boolean | `false`         | 差分を JSON（`{ baselineGeneratedAt, added, removed, changed, renames, docs, hasChanges }`）で出力します（CI / ツール向け）。 |
| `--exit-code`  | boolean | `false`         | 変更が見つかったら `1` で終了します（git-diff スタイル）。指定しない場合、`diff` は常に `0` で終了するため情報表示として実行できます。 |
| `--verbose`    | boolean | `false`         | 設定解決とスナップショットの詳細を **stderr** に出力します。 |

### 出力

```
ovellum diff — current source vs .ovellum/ir.json (built 2026-06-24T17:58:46.322Z)

  + 1 added   - 0 removed   ~ 1 changed   → 1 renamed

likely renames:
  → src/date.ts::formatDate → src/date.ts::formatDateUTC  (97%)

added:
  + src/math.ts::mul  (function)

changed:
  ~ src/math.ts::add  (function)  signature, params

docs that would change:
  ~ docs/math.md  (+1 ~1 -0)
```

差分がない場合:

```
ovellum diff — no changes since the last build (.ovellum/ir.json, <timestamp>).
```

### 終了コード

| Code | 意味                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| `0`  | 成功 — 変更なし、または `--exit-code` なしで変更を表示した場合。                |
| `1`  | **`--exit-code` 付き**で変更が見つかった場合、または比較するスナップショットがない/読めない場合。 |
| `3`  | `ConfigError` — 設定スキーマが不正、ファイルが見つからない、など。                    |

### 例

```bash
# See what a rebuild would change
npx ovellum build           # records the baseline snapshot
# ...edit source...
npx ovellum diff            # preview the impact

# Fail CI if docs would drift from source
npx ovellum diff --exit-code
```

## `ovellum dev`

ビルド + 監視 + 配信 + ライブリロードを組み合わせたループです。
執筆中に走らせておきたい 1 つのコマンドです。

### 構文

```
ovellum dev [--cwd <dir>] [--config <path>] [--port <n>] [--host <addr>] [--no-drafts] [--verbose]
```

### フラグ

| Flag              | Type    | Default     | 説明                                                                                |
| ----------------- | ------- | ----------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>`     | path    | `cwd`       | プロジェクトのルート。                                                                        |
| `--config <path>` | path    | auto        | 自動検出をスキップし、このファイルを直接読み込みます。                                          |
| `--port <n>`      | integer | `3000`      | 開始ポート。使用中の場合、最大 19 ポート先まで自動でずらして試し、それでもだめなら諦めます。          |
| `--host <addr>`   | string  | `127.0.0.1` | バインドアドレス。`0.0.0.0` を渡すとローカルネットワークに公開します。                         |
| `--no-drafts`     | flag    | drafts on   | [ドラフト](/ja/docs/guides/drafts/)ページをローカルで隠し、本番が公開する内容をそのまま確認します。（`watch` も `--no-drafts` を受け付けます。） |
| `--verbose`       | flag    | off         | 配信した各リクエストを `METHOD path → status` の形でログ出力します（ルーティングや 404 のデバッグに便利）。 |

### 挙動

1. 設定を読み込み、`config.output`（ビルドの `dist/` ディレクトリ）を解決します。
2. `--host:--port` にバインドした HTTP サーバーを起動します。
3. 初回ビルドを実行し、その後 `input/` と設定ファイルの変更を監視します
   （`ovellum watch` と同じ 300 ms のデバウンス）。
4. ビルドが成功するたびに、接続中のすべてのブラウザタブに Server-Sent Events で
   `reload` イベントを送ります。注入されたクライアントスクリプトが
   `location.reload()` を呼び出します。
5. `Ctrl-C` でウォッチャーとサーバーの両方をクリーンに停止します。

注入されるリロードスクリプトは、HTML レスポンスに対してのみ、かつ `dev` が
実行中のコマンドである場合にのみ追加されます。`ovellum build` の出力が変更されることはありません。

### 出力

```
ovellum dev starting from .../ovellum.config.json
built 17 page(s) in 720ms

watching content for changes…
local:   http://127.0.0.1:3000/
press Ctrl-C to exit.
```

保存後:

```
changed: content/getting-started.md
built 17 page(s) in 60ms
```

### 終了コード

| Code | 意味                                                            |
| ---- | ------------------------------------------------------------------ |
| `0`  | クリーンな停止（Ctrl-C）。                                           |
| `1`  | モード非対応。auto/hybrid は閲覧可能な HTML ではなく `.md` を生成するため、`dev` は manual 専用です。これらのモードでは `ovellum watch` を使ってください。 |
| `3`  | 設定が不正。                                                    |

### 例

```bash
# Default: localhost:3000
npx ovellum dev

# Pick a port
npx ovellum dev --port 4000

# Expose to the LAN (useful for mobile testing)
npx ovellum dev --host 0.0.0.0

# Multi-site monorepo
npx ovellum dev --cwd ./website
```

## `ovellum serve`

監視を行わない純粋な静的ファイルサーバーです。本番ビルドを実際の配信時と
まったく同じ形でプレビューしたい場合や、再ビルドを別の場所で扱う
プロセスマネージャーに組み込む場合に便利です。

### 構文

```
ovellum serve [--cwd <dir>] [--config <path>] [--port <n>] [--host <addr>]
```

フラグは `ovellum dev` と同一です。サーバーは `config.output` から読み込みます。
そのディレクトリが存在しない場合、`serve` は `1` で終了し、`ovellum build` または
`ovellum dev` を案内します。

### `ovellum dev` との違い

| | `dev` | `serve` |
|---|---|---|
| 初回ビルド | あり（ウォッチャー経由） | なし — 既存の `dist/` が必要 |
| ファイル監視 | あり | なし |
| リロードスクリプトの注入 | あり | なし |
| キャッシュヘッダー | `no-store` | `public, max-age=0` |

サーバーだけが必要な場合（例えば別のシェルで自分で `ovellum watch` を
動かしている場合）は、`serve` が適切なコマンドです。

## `ovellum check`

検証のみのパスで、書き込みは行いません。設定を読み込み、`input/` 配下の
すべての `.md` ファイルを走査し、remark でリンクを抽出した上で（フェンス付き
コードブロックは正しく無視されます）、次を検証します。

1. すべての内部リンクが、サイドバーナビゲーション内の実在するページ URL に解決されること。
2. 安全でない URL スキーム（`javascript:`、`vbscript:`、`data:`、`file:`）を
   使うリンクがないこと。`renderMarkdown` がレンダリング時にこれらを除去するとはいえ、
   `check` はここで警告し、作者がソースの段階で削除できるようにします。
3. i18n サイト（`site.locales` が 2 つ以上）では、翻訳がそのソースページと
   同期していること — [翻訳の陳腐化](#翻訳の陳腐化)を参照してください。

### 構文

```
ovellum check [--cwd <dir>] [--config <path>] [--update-translations] [--json] [--strict]
```

### フラグ

| フラグ                    | 型      | デフォルト | 説明                                                                            |
| ------------------------- | ------- | ---------- | ------------------------------------------------------------------------------- |
| `--cwd`                   | string  | cwd        | プロジェクトルート。                                                            |
| `--config`                | string  | —          | `ovellum.config.{ts,js,json}` へのパス。                                        |
| `--update-translations`   | boolean | `false`    | 各翻訳ページの `sourceHash` を現在のソースにスタンプして終了します。下記参照。  |
| `--json`                  | boolean | `false`    | 結果（またはスタンプ結果）を JSON で出力します。終了コードは変わりません。[自動化](/ja/docs/guides/automation/)を参照。 |
| `--strict`                | boolean | `false`    | [追加の検証](#strict-モード--strict)を実行します（デフォルトはオフ）。strict の問題も他と同様に `1` で終了します。 |
| `--verbose`               | boolean | `false`    | 設定解決とスキャンの詳細を **stderr** に出力します。 |

### strict モード（`--strict`）

`--strict` はデフォルトに加えて 3 つのオプトイン検証を追加します:

- **位置依存の保護ゾーン** — `id=` のない `<!-- @manual:start -->`。id のない
  ゾーンは位置で照合されるため、並べ替えで失われる可能性があります。`id="..."` を
  付けてください。（hybrid / auto）
- **古いアンカー** — 生成ドキュメント内の `<!-- ovellum:anchor id="…" -->` で、
  そのシンボルがソースにもう存在しないもの（削除、または再ビルドされていないリネーム）。
  再ビルドするか、文章を[再アタッチ](#再アタッチ--reattach)してください。（hybrid / auto）
- **タイトルのないページ** — フロントマターの `title:` も先頭の `# 見出し` もない
  ページで、実質的なタイトルがありません。（manual）

strict の問題は出力で `[STRICT]` とタグ付けされ、`strict issues:`（`--json` では
`counts.strictIssues`）に計上されます。

### 出力

問題なし:

```
ovellum check complete in 76ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  broken links:    0
  unsafe schemes:  0
```

問題あり:

```
ovellum check complete in 87ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  broken links:    1
  unsafe schemes:  1
  details:
    content/getting-started.md:42   [SECURITY] unsafe URL scheme 'javascript:' — link will be stripped by the HTML sanitizer (raw: javascript:alert(1))
    content/getting-started.md:112  broken internal link to /no/such/page/ (raw: /no/such/page/)
```

### 終了コード

- `0` 問題なし
- `1` 1 件以上の問題が見つかった
- `3` 設定が不正

### モードごとの挙動

**Manual モード** — `input/` を走査して `.md` ファイルを探し、すべての内部リンクを
サイドバーナビゲーションに対して検証します。i18n サイトでは、これは**ロケールごと**に
実行されます。各 `content/<code>/` サブツリーがそれぞれのロケールプレフィックス付きの
ナビを構築し、リンクは全ロケールの URL の和集合に対して検証されます — そのため
`/ja/…` リンク、デフォルトロケールへのロケール横断 `/docs/…` リンク、相対リンクが
すべて正しく解決されます。

**Hybrid / auto モード** — **出力**ディレクトリ（自動生成された Markdown）を走査し、
すべての内部リンクをディスク上の実ファイルに対して検証し、安全でない URL スキームも
同じように警告します。出力ディレクトリが存在しない場合、`check` は `1` で終了し、
まず `ovellum build` を実行するよう案内します。

タイトルのチェックや id なし / 古いアンカーの検証は
[`--strict`](#strict-モード--strict)で利用できます。孤立の一覧は
[`ovellum orphans`](#ovellum-orphans)にあります。

### 翻訳の陳腐化

`site.locales` が 2 つ以上あるサイトでは、`check` は各翻訳ページが、それがミラーする
デフォルトロケールのページ（ロケールフォルダをまたいで同一のパスで対応）と同期して
いることも検証します。各翻訳はフロントマターに `sourceHash` を持ちます — ソースページの
**本文**の指紋です（フロントマターは除外、改行コードは正規化）。`check` はこれを再計算し、
`[i18n]` タグを付けて報告します:

- スタンプ後にソースが**変わった**翻訳（stale）。
- `sourceHash` が**ない**翻訳（未スタンプ）。
- 対応する**ソースページがない**翻訳（orphan）。

いずれも issue として数えられるため、`check` は `1` で終了します — CI がドリフトを
検知できます。翻訳を同期させた後にハッシュをスタンプ（または再スタンプ）するには、次を
実行します:

```
ovellum check --update-translations
```

各翻訳ページに現在の `sourceHash` を書き込み（変更するのはそのフロントマター 1 行だけ）、
`0` で終了します。ワークフローは [i18n ガイド](/ja/docs/guides/i18n/#翻訳を同期させ続ける)
を参照してください。

## `ovellum watch`

ビルド後、`input/`（と設定ファイル）の変更を監視し、変更のたびに再ビルドします。
部分的な書き込みが中途半端な状態での再ビルドを引き起こさないよう、`chokidar` の
`awaitWriteFinish` を有効にした上で 300 ms でデバウンスされます。すべてのモード
（manual、hybrid、auto）で動作します。ウォッチャーが適切なビルドパスへ自動的に
ディスパッチします。

よくある「再ビルド + 配信 + 自動リフレッシュ」のループ（manual モード）には、
ほぼ確実に [`ovellum dev`](#ovellum-dev) の方が適しています。`watch` はその基礎部品で、
別のサーバー（CDN エミュレーター、リバースプロキシ、自前のプロセスマネージャー）を
動かしたい場合や、ビルド通知をどこかに流したい場合、あるいは auto / hybrid モード
（ライブリロードする HTML がなく、再生成された Markdown のみ）の場合に役立ちます。

### 構文

```
ovellum watch [--cwd <dir>] [--config <path>]
```

### 挙動

- 起動時に初回ビルドが一度実行されます。
- `input/` 配下のいずれかのファイルの変更で、同じパイプラインが再トリガーされます。
- **インクリメンタル再ビルド（auto / hybrid）。** 初回ビルド後、ウォッチャーはパーサーを
  ウォームに保ち、変更したファイルだけを再解析し、内容が実際に変わったドキュメントだけを
  再ビルドします — 大きなコードベースで大幅に高速です。永続化された
  [IR スナップショット](#ovellum-build)は引き続きプロジェクト全体を反映し、hybrid の
  保護ゾーンはフルビルドと同じように保持されます。（manual モードは従来どおりサイト全体を
  再ビルドします。）
- **設定ファイル自体**の変更があった場合は、次のビルドの前に再読み込みします
  （include/exclude グロブが変わった可能性があるため、ウォームパーサーもリセットします）。
- `Ctrl-C` でウォッチャーをクリーンに停止します。

HTTP サーバーもライブリロードもありません。別のターミナルで `ovellum serve` と
組み合わせるか、お好みの別の静的サーバーを利用してください。

## `ovellum upgrade`

npm レジストリに新しく公開された `ovellum` がないか確認し、インストールします。
このコマンドは Ovellum がどのようにインストールされたか（グローバルかローカルの
devDependency か、どのパッケージマネージャーか）を検出し、対応するインストール
コマンドを実行します。

このコマンドは**プロジェクトのローカル依存を優先します**。カレントディレクトリの
`package.json` が `ovellum` を宣言している（または既に `node_modules` にある）場合、
グローバルバイナリで呼び出してもプロジェクト（`… add -D ovellum@latest`）を対象にし、
パッケージマネージャーはプロジェクトのロックファイルから読み取ります。そうした
プロジェクトの外にいるときだけグローバルインストールにフォールバックします。表示される
行に対象が示されます。例: `Update available: 0.10.0 → 0.10.1 (this project's local
dependency).`

### 構文

```
ovellum upgrade [--dry-run] [--yes]
```

### フラグ

| Flag        | Type    | Default | 説明                                                          |
| ----------- | ------- | ------- | -------------------------------------------------------------- |
| `--dry-run` | boolean | `false` | アップグレードコマンドを実行せずに表示します。                  |
| `--yes, -y` | boolean | `false` | 確認プロンプトをスキップし、すぐに実行します。              |

### 挙動

- すでに最新バージョンの場合は、その旨を表示して `0` で終了します。
- そうでない場合は `current → latest` と正確なインストールコマンドを表示します。
- 対話モードでは実行前に確認します（デフォルトは yes）。`--yes` では確認なしで
  実行し、`--dry-run` では表示のみ行います。
- `--yes` なしの**非対話**シェル（TTY なし）では、コマンドを表示するだけで
  実行せずに終了します。CI やスクリプト内で環境を黙って変更することは決してありません。
- インストールは出力を継承したサブプロセスで実行されます。`ovellum upgrade` は
  そのプロセスの終了コードで終了します。

### 更新通知

このコマンドとは独立して、Ovellum は新しいバージョンが存在する場合、コマンドの
完了後に 1 行の **「update available」** 通知を表示します。これはあくまで案内であり、
`ovellum upgrade` なしに何かがインストールされることはありません。このチェックは:

- `update.intervalHours`（デフォルト 24h）あたり最大 1 回だけ npm にアクセスします。
  結果はキャッシュされるため、ほとんどの実行ではネットワーク I/O は発生しません。
- CI、非対話シェル、`NO_UPDATE_NOTIFIER` が設定されている場合、`--no-update-check` が
  渡された場合、そして [`update.check`](/ja/docs/reference/config/#update) が `false` の場合は
  **無効**になります。
- コマンドを遅延させたり失敗させたりすることは決してありません。あらゆるエラー経路は握りつぶされます。

## `ovellum orphans`

[`protect.orphanDir`](/ja/docs/reference/config/#protect)（デフォルト
`.ovellum/orphans/`）配下の隔離された手動ブロックを一覧表示します。hybrid ビルド中に
保護された `@manual` ブロックのアンカーが消えると、その文章は失われる代わりにここへ
移されます。`ovellum orphans` は溜まったものを確認するためのコマンドです。読み取り専用で、
何も書き込みません。

各孤立について、アンカー id、それが存在していたドキュメント、孤立した日時（および経過日数）、
アンカーを最後に見たビルド、そして — [IR スナップショット](#ovellum-build)がある場合は —
そのアンカーが**ソースに戻っている**（手作業で再アタッチできる）か**消えた**ままかを表示します。

### 構文

```
ovellum orphans [--cwd <dir>] [--config <path>] [--stale] [--json] [--reattach]
```

### フラグ

| Flag          | Type    | Default         | 説明                                                                  |
| ------------- | ------- | --------------- | ---------------------------------------------------------------------- |
| `--cwd <dir>` | path    | `process.cwd()` | プロジェクトのルート。                                                          |
| `--config <path>` | path | auto-discovered | 自動検出をスキップし、このファイルを直接読み込みます。                            |
| `--stale`     | boolean | `false`         | [`protect.orphanRetention`](/ja/docs/reference/config/#protect) 日（デフォルト `90`）より古い孤立だけを表示します — 四半期レビュー向けのフィルタです。 |
| `--json`      | boolean | `false`         | 一覧を JSON（`{ orphanDir, retentionDays, hasSnapshot, count, orphans[] }`）で出力します（CI / ツール向け）。 |
| `--reattach`  | boolean | `false`         | **対話的に** 孤立を 1 件ずつ確認し、再アタッチ・削除・スキップします（下記参照）。ターミナルが必要です。 |

### 出力

```
ovellum orphans — 1 orphan in .ovellum/orphans/

  src/math.ts::add
    orphaned:   2026-06-24T18:25:19.412Z (today)
    last seen:  2026-06-24T18:25:18.992Z
    doc:        docs/math.md
    block id:   why
    anchor:     gone from current source
    file:       .ovellum/orphans/2026-06-24_src-math.ts-add.md
```

### 再アタッチ（`--reattach`）

`ovellum orphans --reattach` はアーカイブを 1 件ずつ巡回し、各孤立について次を行えます:

- 提案されたアンカーへ **再アタッチ** します — シンボルがソースに戻っていれば同じアンカー、
  リネームされた可能性が高ければ名前が近いアンカー（別のアンカー id を入力することもできます）。
  文章はそのアンカーの下の `@manual` 保護ゾーンに書き込まれるので次回のビルドでも保持され、
  アーカイブファイルは削除されます。
- 孤立を **削除**（確認あり）、または **スキップ** します。

現在のアンカーは直前のビルドの [IR スナップショット](#ovellum-build)から読み取るため、先に
`ovellum build` を実行してください。再アタッチ先はビルド済みドキュメントなので、変更は再ビルドが
保持するのとまったく同じ場所に入ります。

### 終了コード

| Code | 意味                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | 成功（孤立が 1 つもない場合を含む）。                                   |
| `3`  | `ConfigError` — 設定スキーマが不正、ファイルが見つからない、など。 |

## `ovellum mcp`

Ovellum を [Model Context Protocol](https://modelcontextprotocol.io) サーバーとして
stdio 上で起動し、AI エージェントが第一級のツールとして操作できるようにします。stdin/stdout
で改行区切りの JSON-RPC を話します — 任意の MCP クライアントを `ovellum mcp` に向ければ、
下記のツールが検出されます。（追加の依存はありません。サーバーは CLI に組み込まれています。）

### 構文

```
ovellum mcp [--cwd <dir>]
```

`--cwd` はツールが操作するプロジェクトのルートを指定します（デフォルトはカレント
ディレクトリ）。**stdout はプロトコルのチャネル**です — それ以外のものを流し込まないでください。

### ツール

| Tool                   | 読み / 書き    | 内容                                                                 |
| ---------------------- | -------------- | --------------------------------------------------------------------------- |
| `ovellum_query_symbol` | IR を読む       | `.ovellum/ir.json` 内のシンボルをアンカー `id` または `name` で検索します — シグネチャ・ソース位置・引数・戻り値。 |
| `ovellum_diff`         | IR を読む       | 直前のビルドに対する追加 / 削除 / 変更 / リネームされたシンボルと、変わるドキュメント。 |
| `ovellum_check`        | 読む           | プロジェクトを検証します — リンク切れ・安全でない URL スキーム・古い翻訳。件数と問題ごとの一覧。 |
| `ovellum_list_orphans` | 読む           | 隔離された手動ブロック（任意の `stale` フィルタ）と、スナップショットに対する再アタッチ可否。 |
| `ovellum_get_page`     | 読む           | 1 ページのビルド済み Markdown（AI フレンドリーな `.md` ミラー）を、出力ディレクトリ配下のパスで取得します。 |
| `ovellum_search_docs`  | 読む           | ビルド済みドキュメントの全文検索。パス・タイトル・スコア・抜粋付きでランク付けされたページを返します。 |
| `ovellum_build`        | docs を書く    | ビルドを実行します。ビルドサマリーを返します。                                     |
| `ovellum_write_zone`   | **文章を書く** | アンカー id の下の保護された `@manual` ゾーンに Markdown を書き込みます。hybrid のマージエンジンが次回の再生成でも保持します — 人間が `@manual:start/end` の間を編集するのと同じ保証です。`dryRun` 対応。 |
| `ovellum_reattach`     | 文章を書く     | 孤立を救出します。文章を対象アンカー（既定: 提案された復活 / リネーム先）の下へ差し戻してアーカイブを削除、または削除します。非対話版の `orphans --reattach`。 |

`ovellum_write_zone` は、他のどんなドキュメントサーバーも提供できないものです。エージェントが
手書きの文章を寄与し、それが次回のビルドで上書きされる代わりに**再生成を生き延びます**。生存には
[`hybrid` モード](/ja/docs/concepts/modes/)が必要です。`auto` モードではブロックは書き込まれますが、
次回のビルドで上書きされます。

IR ベースのツールはスナップショットを必要とします — 先にビルドを実行してください（または
`ovellum_build` を呼んでください）。そうすれば `.ovellum/ir.json` が存在します。

### リソース

ツールに加えて、サーバーは Ovellum の読み取り面を MCP **リソース**として公開します —
エージェントが直接取り込めるコンテキストです:

| URI | 内容 |
| --- | --- |
| `ovellum://llms.txt` / `ovellum://llms-full.txt` | AI 用のインデックス / コーパス（ビルド済みのとき）。 |
| `ovellum://page/{path}` | ビルド済みページの Markdown を出力相対パスで（リソーステンプレート）。 |
| `ovellum://ir` | 解析済みの IR スナップショット（`.ovellum/ir.json`）。 |
| `ovellum://orphans` | 隔離された手動ブロックと、経過日数 + 再アタッチ可否。 |

### プロンプト

そして、厳選された**プロンプト**（クライアントが提示する誘導ワークフロー）:

| Prompt | 内容 |
| --- | --- |
| `set-up-ovellum` | ドキュメントをスキャフォールドし、hybrid の契約を説明します。 |
| `document-symbol`（`symbol`） | シンボルを読み、文章を起案し、再生成を生き延びる保護ゾーンに書き込みます。 |
| `review-doc-drift` | スナップショットと差分し、再アタッチすべき孤立を提示します。 |

### 例（Claude Code）

```bash
claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
```

## 計画中のサブコマンド

### `ovellum clean`

手動ファイルを保持したまま、自動生成ファイル（`ovellum: true` フロントマターで
識別）を削除します。デフォルトはドライランで、`--confirm` で実際に削除します。
**`.ovellum/orphans/` はデフォルトで保持します**（あれはコミット済みの手書きの文章
です）。孤立アーカイブも削除するには `--orphans` を渡します。手書きの文章の削除は
意図的でなければならないため、このフラグなしには決して起きません。

## 共通フラグ

真のグローバルではなく、多くのコマンドに共通して現れるフラグです:

| Flag        | 対象                          | 説明                                                              |
| ----------- | ----------------------------- | ----------------------------------------------------------------- |
| `--cwd`     | すべて                        | プロジェクトのルート。                                            |
| `--config`  | ビルド系コマンド              | 設定ファイルへのパス（指定しなければ自動検出）。                  |
| `--json`    | `build` / `check` / `diff`    | 機械可読な出力。[自動化](/ja/docs/guides/automation/)を参照。     |
| `--verbose` | `build` / `check` / `diff`    | 設定解決とステージ / ファイル I/O の詳細を stderr に出力。        |
| `--strict`  | `check`                       | [追加の検証](#strict-モード--strict)。問題があれば `1` で終了。   |
