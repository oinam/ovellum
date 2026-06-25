---
title: 自動化と AI エージェント
description: スクリプト・CI ジョブ・AI エージェントから Ovellum を操作する — 機械可読な --json 出力、安定した終了コード、MCP サーバー。
sourceHash: 'ae2f8292d93873e5'
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

### `build --json`

```json
{
  "ok": true,
  "command": "build",
  "mode": "hybrid",
  "durationMs": 211,
  "config": "/project/ovellum.config.json",
  "warnings": [],
  "sources": 2,
  "written": ["docs/format.md", "docs/user.md"],
  "merged": [],
  "orphans": 0,
  "quarantined": [],
  "ir": ".ovellum/ir.json",
  "manifest": null
}
```

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

## MCP サーバー

エージェント向けに、`ovellum mcp` は Ovellum を
[Model Context Protocol](https://modelcontextprotocol.io) サーバーとして stdio 上で
起動します。同じ操作をツールとして公開します — シンボルの検索、diff、check、孤立の一覧、
ページの取得、ビルド、そして**再生成を生き延びる保護ゾーンへの書き込み**。完全なツール
一覧は [`ovellum mcp` リファレンス](/ja/docs/reference/cli/#ovellum-mcp)を参照してください。

```bash
claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
```

## エージェントに Ovellum の使い方を伝える

2 つの成果物が、エージェントが探す場所で待ち受けます:

- **`AGENTS.md`** — `ovellum init` がプロジェクトのルートに `AGENTS.md`（「コーディング
  エージェントへの指示」のツール横断的な慣習）を生成します。モードに応じた内容で、
  hybrid/auto プロジェクトでは保護ゾーンの契約 — 何が再生成を生き延び、何が上書きされるか —
  を先頭に置くので、エージェントが正しい場所を編集します。既存の `AGENTS.md` がある場合は
  書き込みません。
- **Claude Skill** — すぐ使える `SKILL.md`（「Ovellum ドキュメントのセットアップと保守」）が
  リポジトリの
  [`skills/ovellum-docs/`](https://github.com/oinam/ovellum/tree/main/skills/ovellum-docs)
  にあります。そのフォルダをプロジェクトの `.claude/skills/`（または `~/.claude/skills/`）に
  コピーすれば、Claude Code が要求に応じて Ovellum ドキュメントをスキャフォールド・ビルド・
  安全に編集できます。

## AI フレンドリーな出力

ビルドは HTML の隣に機械可読なコンパニオンも出力します — `/llms.txt`、
`/llms-full.txt`、全ページの `.md` ミラー — エージェントが HTML をスクレイピングせずに
ドキュメントを読めます。デフォルトでオンです。[`site.ai`](/ja/docs/reference/config/#ai)
を参照してください。
