---
title: 自動化と AI エージェント
description: スクリプト・CI ジョブ・AI エージェントから Ovellum を操作する — 機械可読な --json 出力、安定した終了コード、MCP サーバー。
sourceHash: '96ea9e51a0e383bf'
---

# 自動化と AI エージェント

Ovellum は、ターミナルの前の人間以外のもの — CI ジョブ、デプロイスクリプト、AI
エージェント — から操作されることを前提に作られています。すべてのコマンドはパイプ
されてもきれいに動作し、主要なコマンドは JSON を話し、終了コードは安定しており、
エージェント向けの組み込み [MCP サーバー](#mcp-server)があります。全体像 — なぜ
あなたのドキュメントが最初から AI 対応なのか — は
[AI エージェントのための Ovellum](/ja/docs/concepts/ai-ready/)を参照してください。

## 機械可読な出力（`--json`）

`build`、`check`、[`diff`](/ja/docs/reference/cli/#ovellum-diff) は `--json`
フラグを受け付けます。JSON 経路では装飾的な出力はありません — stdout はパース可能な
単一の JSON オブジェクトで、成功時には stderr には何も書き込まれません。

```bash
ovellum build --json
ovellum check --json
ovellum diff --json
```

いずれにも `--verbose` を付けると、設定解決と各ステージ / ファイル I/O の詳細が出ます。
出力先は **stderr** なので、`--json` ときれいに併用できます（stdout は純粋な JSON のままです）。

### `build --json`

```json
{
  "ok": true,
  "command": "build",
  "mode": "hybrid",
  "durationMs": 211,
  "config": "/project/ovellum.config.json",
  "warnings": [
    { "message": "did src/date.ts::a become …::b? …", "severity": "info" }
  ],
  "sources": 2,
  "written": ["docs/format.md", "docs/user.md"],
  "merged": [],
  "orphans": 0,
  "quarantined": [],
  "ir": ".ovellum/ir.json",
  "manifest": null
}
```

`warnings[]` の各エントリは `{ message, severity }` です。`severity` は
`"warning"`（対処すべき実際の問題 — 孤立したコンテンツ、安全のためスキップされた
アセット、解析できない日付）または `"info"`（ビルドが行ったことの良性の通知 —
ドラフトの除外、`site.baseUrl` 未設定による `sitemap.xml` のスキップ）です。
`severity` で分岐すれば、実際の問題のときだけ CI を失敗させられます:
`summary.warnings.some(w => w.severity === "warning")`。ターミナルの人間向け
サマリーはこれらを別々に数え（`warnings:` と `notes:`）、`warning:`/`info:` の行を
実際の問題を先頭にして表示します。

`manual` モードでは auto/hybrid のフィールドが `output`、`pages`
（`[{ url, outputPath }]`）、`landingRendered` に置き換わります。

### `check --json`

```json
{
  "ok": false,
  "command": "check",
  "mode": "manual",
  "durationMs": 9,
  "config": "/project/ovellum.config.json",
  "pages": 42,
  "counts": { "brokenLinks": 1, "unsafeSchemes": 0 },
  "issues": [
    { "file": "content/index.md", "line": 3, "kind": "broken-link", "message": "..." }
  ]
}
```

`counts.staleTranslations` は [i18n](/ja/docs/guides/i18n/) サイト（`site.locales`
が 2 つ以上）でのみ現れます。`issue.kind` は `broken-link`、`unsafe-scheme`、
`stale-translation`、`orphan-translation` のいずれか — さらに
[`--strict`](/ja/docs/reference/cli/#strict-モード--strict) では `positional-zone`、
`stale-anchor`、`missing-frontmatter`（`counts.strictIssues` に計上）が加わります。

## 終了コード

コマンド間で安定しているため、スクリプトは出力をスクレイピングせずに分岐できます:

| Code | 意味                                                                 |
| ---- | ---------------------------------------------------------------------- |
| `0`  | 成功 — ビルド完了、または `check` / `diff` が何も検出しなかった。              |
| `1`  | 問題を検出（`check` のリンク切れ、`diff --exit-code` の変更）、またはビルドエラー。 |
| `3`  | `ConfigError` — 設定が不正、または見つからない。`--json` モードではエラーは stdout に `{ "ok": false, "error", "hint" }` として出ます。 |

`diff` は `--exit-code` を渡さない限り、変更があっても `0` で終了します（git-diff の
慣習）。「ソースとドキュメントがずれたら CI を失敗させる」ゲートに便利です:

```bash
ovellum build            # ベースラインの IR スナップショットを記録
ovellum diff --exit-code # 現在のソースが一致しなくなったら exit 1
```

## プログラマティック API

CLI を起動するより、プロセス内で Ovellum を動かしたいとき — フレームワークの開発
サーバー、モノレポのタスク、独自のビルドステップから — ライブラリとしてインポートします。
`import 'ovellum'` は副作用がなく（CLI は別のバイナリ）、関数は CLI と同じ構造化された
結果を返します。

```ts
import { build, watch } from 'ovellum';

// 一回限り: ホストプロジェクトの配信フォルダへ直接ドキュメントを出力。
const summary = await build({ cwd: 'docs', out: '../site/public/docs', base: '/docs' });
console.log(summary.written);

// 開発サーバーと並走: 変更で再ビルドし、各ビルド完了時にリフレッシュ。
const watcher = await watch({ cwd: 'docs', onBuild: () => devServer.reload() });
// …終了時:
await watcher.close();
```

- **`build(options)`** → `BuildSummary`。オプション: `cwd`、`configFile`、`out`、
  `base`、`drafts`、`manifest`、`onLog`（`--verbose` のストリーム）。
- **`watch(options)`** → `close()` を持つハンドル。オプション: `cwd`、`configFile`、
  `drafts`、`onBuild`、`onError`。出力ディレクトリ / ベースパスは設定で指定します。
  auto/hybrid モードでは再ビルドはインクリメンタルです。
- **`loadConfig(options)`** → 解決・検証済みの設定。
- **`defineConfig`** と設定 / サマリーの型を再エクスポートしているので、TypeScript の
  `ovellum.config.ts` とビルドスクリプトが単一の真実のソースを共有します。

パッケージは ESM 専用（`type: module`）です。CommonJS からは動的 `import()` を使ってください。

## MCP サーバー

エージェント向けに、`ovellum mcp` は Ovellum を
[Model Context Protocol](https://modelcontextprotocol.io) サーバーとして stdio 上で
起動します — これは AI の普遍的なランタイムインターフェースです（Claude Code、Cursor、
Windsurf、Cline、VS Code などがすべて話します）。Ovellum を**ツール**（シンボルの検索、
diff、check、孤立の一覧、ページの取得、ドキュメントの全文検索、ビルド、孤立の再アタッチ、
そして**再生成を生き延びる保護ゾーンへの書き込み**）、**リソース**（`ovellum://llms.txt`、
`ovellum://llms-full.txt`、`ovellum://page/{path}`、`ovellum://ir`、`ovellum://orphans`）、
**プロンプト**（`set-up-ovellum`、`document-symbol`、`review-doc-drift`）として公開します。完全な一覧は
[`ovellum mcp` リファレンス](/ja/docs/reference/cli/#ovellum-mcp)を参照してください。

### お使いの AI ツールへのインストール

**Claude Code** — 同梱プラグイン（Skill + MCP サーバー）でワンステップ:

```
/plugin marketplace add oinam/ovellum
/plugin install ovellum@ovellum
```

または直接登録: `claude mcp add ovellum -- npx ovellum mcp`。

**Cursor / Windsurf / Cline / VS Code** — そのツールの MCP 設定
（`.cursor/mcp.json`、`~/.codeium/windsurf/mcp_config.json`、Cline の MCP 設定、
`.vscode/mcp.json`）に Ovellum を追加します:

```json
{
  "mcpServers": {
    "ovellum": { "command": "npx", "args": ["-y", "ovellum", "mcp"] }
  }
}
```

サーバーはプロジェクトディレクトリで実行されるので、そこに `ovellum` をインストール
してください（または `--cwd` を渡します）。（VS Code の `.vscode/mcp.json` は
`"mcpServers"` の代わりに `"servers"` キーを使います。値は同じです。）

Ovellum は [MCP レジストリ](https://registry.modelcontextprotocol.io)にも
`io.github.oinam/ovellum` として登録されているので、レジストリを参照する
クライアントから見つけられます。

## エージェントに Ovellum の使い方を伝える

2 つの成果物が、エージェントが探す場所で待ち受けます:

- **`AGENTS.md`** — `ovellum init` がプロジェクトのルートに `AGENTS.md`（「コーディング
  エージェントへの指示」のツール横断的な慣習）を生成します。モードに応じた内容で、
  hybrid/auto プロジェクトでは保護ゾーンの契約 — 何が再生成を生き延び、何が上書きされるか —
  を先頭に置くので、エージェントが正しい場所を編集します。既存の `AGENTS.md` がある場合は
  書き込みません。
- **Claude Skill** — 上記の [Claude Code プラグイン](#お使いの-ai-ツールへのインストール)が
  `ovellum-docs` skill を同梱しているので、Claude が要求に応じて Ovellum ドキュメントを
  スキャフォールド・ビルド・安全に編集できます。プラグインなしで使うには、
  [`plugins/ovellum/skills/ovellum-docs/`](https://github.com/oinam/ovellum/tree/main/plugins/ovellum/skills/ovellum-docs)
  を `.claude/skills/` にコピーしてください。

## AI フレンドリーな出力

ビルドは HTML の隣に機械可読なコンパニオンも出力します — `/llms.txt`、
`/llms-full.txt`、全ページの `.md` ミラー — エージェントが HTML をスクレイピングせずに
ドキュメントを読めます。デフォルトでオンです。[`site.ai`](/ja/docs/reference/config/#ai)
を参照してください。

### ページごとの LLM アクション

`.md` ミラーが有効なとき（デフォルト）、各ドキュメントページには小さなアクションの行が
付きます: **ページをコピー**（ページの Markdown をクリップボードにコピー）、
**Markdown で表示**（生の `.md`）、そして — `site.baseUrl` が設定されてリンクが絶対 URL に
なるとき — **ChatGPT で開く** / **Claude で開く**（ページをそのアシスタントに渡します）。
`site.ai.mdMirror` 以外の設定は不要で、オフにすると消えます。
