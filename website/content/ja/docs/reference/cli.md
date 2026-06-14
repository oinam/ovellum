---
title: CLI リファレンス
description: ovellum CLI のすべてのサブコマンドとフラグ。
sourceHash: 'c566b925a17a50d3'
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
| `dev`      | available | ビルド、監視、配信、接続中のブラウザのライブリロードをまとめて実行する、1 コマンドの開発ループです。 |
| `watch`    | available | ビルド後、`input/` 配下の変更ごとに再ビルドします（300 ms のデバウンス付き）。   |
| `serve`    | available | ビルド済みサイトを HTTP で配信します。監視もライブリロードもありません。                |
| `check`    | available | 設定を検証し、リンク切れの内部リンクを確認し、安全でない URL を警告します。    |
| `upgrade`  | available | npm に新しい Ovellum がないか確認し、インストールします。                            |
| `orphans`  | planned   | 隔離された手動ブロックの一覧表示・確認・再アタッチを行います。                     |
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
ovellum build [--cwd <dir>] [--config <path>] [--drafts]
```

### フラグ

| Flag              | Type | Default         | 説明                                                           |
| ----------------- | ---- | --------------- | --------------------------------------------------------------- |
| `--cwd <dir>`     | path | `process.cwd()` | プロジェクトのルート。設定内のすべてのパスはこれを基準に解決されます。 |
| `--config <path>` | path | auto-discovered | 自動検出をスキップし、このファイルを直接読み込みます。                     |
| `--drafts`        | flag | off             | [ドラフト](/ja/docs/guides/drafts/)ページを含めます（通常は本番ビルドから除外されます）。 |

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
7. `site.baseUrl` が設定されている場合は `sitemap.xml` を出力します。
8. `site.search.enabled` が `true` の場合は、出力に対して Pagefind を実行し `dist/pagefind/` を出力します。

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
  warnings:  0
    → docs/format.md
    → docs/user.md
  quarantined:          ← only printed when orphans > 0
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

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
```

## `ovellum dev`

ビルド + 監視 + 配信 + ライブリロードを組み合わせたループです。
執筆中に走らせておきたい 1 つのコマンドです。

### 構文

```
ovellum dev [--cwd <dir>] [--config <path>] [--port <n>] [--host <addr>] [--no-drafts]
```

### フラグ

| Flag              | Type    | Default     | 説明                                                                                |
| ----------------- | ------- | ----------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>`     | path    | `cwd`       | プロジェクトのルート。                                                                        |
| `--config <path>` | path    | auto        | 自動検出をスキップし、このファイルを直接読み込みます。                                          |
| `--port <n>`      | integer | `3000`      | 開始ポート。使用中の場合、最大 19 ポート先まで自動でずらして試し、それでもだめなら諦めます。          |
| `--host <addr>`   | string  | `127.0.0.1` | バインドアドレス。`0.0.0.0` を渡すとローカルネットワークに公開します。                         |
| `--no-drafts`     | flag    | drafts on   | [ドラフト](/ja/docs/guides/drafts/)ページをローカルで隠し、本番が公開する内容をそのまま確認します。（`watch` も `--no-drafts` を受け付けます。） |

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
ovellum check [--cwd <dir>] [--config <path>] [--update-translations]
```

### フラグ

| フラグ                    | 型      | デフォルト | 説明                                                                            |
| ------------------------- | ------- | ---------- | ------------------------------------------------------------------------------- |
| `--cwd`                   | string  | cwd        | プロジェクトルート。                                                            |
| `--config`                | string  | —          | `ovellum.config.{ts,js,json}` へのパス。                                        |
| `--update-translations`   | boolean | `false`    | 各翻訳ページの `sourceHash` を現在のソースにスタンプして終了します。下記参照。  |

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
サイドバーナビゲーションに対して検証します。

**Hybrid / auto モード** — **出力**ディレクトリ（自動生成された Markdown）を走査し、
すべての内部リンクをディスク上の実ファイルに対して検証し、安全でない URL スキームも
同じように警告します。出力ディレクトリが存在しない場合、`check` は `1` で終了し、
まず `ovellum build` を実行するよう案内します。

フロントマターの検証、必須フィールドのチェック、hybrid モードの孤立リスト表示は
今後の対応となります。

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
- **設定ファイル自体**の変更があった場合は、次のビルドの前に再読み込みします。
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

## 計画中のサブコマンド

### `ovellum orphans`

`.ovellum/orphans/` を閲覧します。

- デフォルト: メタデータ付きで一覧表示
- `--stale`: `protect.orphanRetention` 日より古い孤立に絞り込み
- `--interactive`: 再アタッチ / 削除 / スキップのプロンプト

### `ovellum clean`

手動ファイルを保持したまま、自動生成ファイル（`ovellum: true` フロントマターで
識別）を削除します。デフォルトはドライランで、`--confirm` で実際に削除します。
`.ovellum/orphans/` には**触れません**（あれはコミット済みの手書きの文章です）。

## グローバルフラグ（計画中）

| Flag        | 説明                                              |
| ----------- | -------------------------------------------------- |
| `--strict`  | 警告をエラーに格上げし、`2` で終了します。              |
| `--verbose` | デバッグ出力を表示します（パーサーの各段階、マージの詳細）。 |

`--cwd` と `--config` は現在 `build`、`check`、`watch` で利用できます。
今後さらにサブコマンドが追加された段階で、グローバルに格上げされる予定です。
