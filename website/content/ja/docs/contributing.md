---
title: コントリビューション
description: リポジトリをセットアップし、テストを実行し、プルリクエストを送る。
sourceHash: 'bd8bfd3688ad3665'
---

# コントリビューション

Ovellum はオープンソースのプロジェクトです。プルリクエストや issue を歓迎します。
このページでは、セットアップの基本と、私たちが従っている規約について説明します。

## ローカルのセットアップ

クローンし、インストールし、ビルドし、テストスイートを実行します:

```bash
git clone https://github.com/oinam/ovellum.git
cd ovellum
pnpm install
pnpm exec turbo run build --filter='@ovellum/*' --filter='ovellum'
pnpm exec turbo run test --filter='@ovellum/*' --filter='ovellum'
```

> （コントリビューターではなく）ユーザーとして、自分のサイトのための反復ループだけが
> ほしい場合は、[開発ガイド](/ja/docs/guides/development/)で `ovellum init` /
> `watch` / `check` / `build` を解説しています。このページはコントリビューター向けで、
> Ovellum のモノレポそのものの内側で作業する話です。

## このウェブサイトをローカルで実行する

いまご覧になっているこのサイトは、リポジトリの `website/` にある本格的な Ovellum
サイトです。4つのワークスペーススクリプトですべてをカバーします:

| スクリプト                      | 内容                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| `pnpm -w run dev:website`       | パッケージをビルドし、`website/` に対して `ovellum dev` を実行します。ビルド + ウォッチ + 配信 + ライブリロードのワンコマンドループです。表示された URL を開いてください。 |
| `pnpm -w run build:website`     | `website/dist/` へのワンショットの本番ビルド。CI はこれを実行します。  |
| `pnpm -w run serve:website`     | ウォッチせずに `website/dist/` を配信します（事前のビルドを前提とします）。 |
| `pnpm -w run check:website`     | 壊れたリンクと安全でない URL の lint。                                 |

日々のループ:

```bash
pnpm -w run dev:website
# website/content/ 以下のどこを編集しても、ブラウザが自動でリフレッシュされます
```

### なぜこれらのスクリプトが CLI をラップするのか

このリポジトリの中では、私たちは Ovellum そのものに取り組んでいます。スクリプトは
**ローカルでビルドした** CLI（`node packages/cli/dist/index.js`）を実行するため、
パッケージへの編集が即座に反映されます。`npx ovellum` を使うと公開済みのバージョンが
取得され、あなたの変更が反映されません。

`@ovellum/site`、`@ovellum/core`、あるいは CLI そのものを反復的に開発している場合、
スクリプトはコマンドを呼び出す前にパッケージのビルドを再実行します。そのため、
`packages/site/src/...` での変更が、追加の手順なしに次のウェブサイトの再ビルドに
反映されます。

### デモフィクスチャ

2つの `examples/` プロジェクトは、エンドツーエンドのスモークテストも兼ねています:

```bash
pnpm -w run demo        # examples/simple-ts/ に対する auto/hybrid のデモ
pnpm -w run demo:site   # examples/manual-site/ に対する manual のデモ
```

出力は各 example ディレクトリの中に生成されます。どちらも gitignore されています。

## リポジトリのレイアウト

```
packages/
  core/        共有の型、設定ローダー、エラークラス。
  parser/      TypeScript / JavaScript ソース → DocProject IR。
  generator/   DocProject IR → Markdown 出力。
  reader/      Markdown → フロントマター + 保護ゾーン。
  merger/      保護ゾーンの差し込み、孤立ブロックの隔離。
  site/        手動モード用の静的サイトビルダー。
  cli/         `ovellum` CLI。

examples/      デモフィクスチャ。
website/       このサイト。
docs/internal/ 設計ドキュメント（DESIGN、SITE、STYLES、TODO、FEATURES、…）。
```

## AI を使ったコントリビュート

Ovellum は AI ネイティブであり、AI アシスタントを使ったコントリビュートを歓迎します。
リポジトリには [`AGENTS.md`](https://github.com/oinam/ovellum/blob/main/AGENTS.md)
（エージェントが従うべき規約）と、Ovellum 自身の
[MCP サーバー](/ja/docs/guides/automation/#mcp-server)が同梱されているので、
アシスタントはシンボルの検索、ソースとドキュメントの diff、ドキュメントの全文検索、
保護ゾーンへの安全な書き込みができます。Claude Code プラグイン
（`/plugin marketplace add oinam/ovellum`）か、任意の MCP クライアントの
`npx ovellum mcp` 設定で導入してください。

AI 支援の作業も他と同じ基準を満たす必要があります — エージェントが最も見落としがちな点:

- **ドキュメントは 2 言語。** ユーザー向けの変更は `website/content/en-US/**` と、
  その 1:1 ミラーである `website/content/ja/**` の両方を更新し、
  `ovellum check --cwd website --update-translations` を実行します。
- **CLI に見える変更には changeset が必要**（`pnpm changeset`）。
- **[hybrid の契約](/ja/docs/concepts/anchors-and-zones/)を尊重する** — 生成された
  領域は手で編集しない。文章は `@manual` ゾーンの中だけが生き残ります。
- プッシュ前に `pnpm build && pnpm typecheck && pnpm lint && pnpm test` を実行。

提出物には責任を持ってください: 差分を読み、テストが通ることを確認し、PR は 1 つの
目的に絞ってください。

## issue のトリアージ

issue は <https://github.com/oinam/ovellum/issues> で受け付けています。報告する前に:

- クローズ済みの issue を検索してください。あなたの問題には、すでに既知の回避策が
  あるかもしれません。
- Ovellum のバージョン（`--version` フラグが用意されれば `npx ovellum --version`
  で取得できます）、Node のバージョン、そして最小限の再現手順を含めてください。
- バグの場合は、期待される動作と実際の動作を記載してください。
- 機能の場合は、提案する形よりも先にユースケースを説明してください。私たちは、
  API の形を単独で議論するよりも、あなたが何をしようとしているのかを理解したいのです。

## コミットの規約

私たちは Conventional Commits に緩やかに従っています:

- `feat(scope): …` 新機能
- `fix(scope): …` バグ修正
- `docs(scope): …` ドキュメント
- `chore(scope): …` ツール / クリーンアップ
- `build(scope): …` ビルドパイプラインの変更
- `refactor(scope): …` 振る舞いを変えない内部的な変更

「scope」は通常、パッケージ名（`core`、`parser`、`site`、…）または高レベルの
領域（`cli`、`docs`、`examples`）です。

コミットは、同じコミット内でのドキュメント更新と対になっているべきです。内部の
ケイデンスルールを参照してください。設定フィールドを変更したら `reference/config.md`
を更新してください。CLI フラグを変更したら `reference/cli.md` を更新してください。

## プルリクエスト

- `main` からブランチを切ってください。ブランチ名は `<scope>/<short-description>`
  の形にします（例: `parser/handle-overloads`）。
- 早めに push してください。まだ流動的なら PR をドラフトとしてマークしてください。
- CI は、PR ブランチへの push のたびに lint、型チェック、テスト、ビルドを実行します。
- PR がグリーンになり、レビューを希望する場合は、ready としてマークしてください。
- 私たちは1週間以内の応答を目指しています。それを過ぎたら催促していただいてかまいません。

## コードスタイル

- TypeScript、strict モード。型のない外部 API とやり取りする場合を除き、`any` は
  使いません。
- 型のみのインポートには `import type` を使ってください。ビルドパイプラインがこれに
  依存しています（`verbatimModuleSyntax: true`）。
- Prettier がすべてをフォーマットします。`pnpm format` で実行されます。
- ESLint の flat config + typescript-eslint がルールを強制します。単一のパッケージなら
  `pnpm lint`、ワークスペース全体なら `pnpm exec turbo run lint` です。
- 1つのデフォルトルール: コード、出力、ドキュメントに絵文字を使わないこと。代わりに
  テキストラベルか、モノクロのインライン SVG を使います。

## リリース

（メンテナー向け。）リリースには `changesets` を使います:

```bash
pnpm changeset
# プロンプトに従い、生成された .changeset/*.md をコミットします
```

`main` へのマージ時に、リリースワークフローが「Version Packages」PR を開き、
バージョン番号を上げて `CHANGELOG.md` を更新します。その PR をマージすると npm に
公開されます。

## ロードマップ、意思決定、設計

プロジェクトの高レベルの形は、次の場所にあります:

- [`docs/internal/DESIGN.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/DESIGN.md)
  — マージエンジン、IR、タグ付けの取り決めの当初のアーキテクチャ。
- [`docs/internal/SITE.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/SITE.md)
  — 手動モードの静的サイトビルダーの設計。
- [`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md)
  — デザイントークン（パレット、タイプ / スペーススケール）。
- [`docs/internal/TODO.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/TODO.md)
  — コード側のチェックリスト。完了済みと先送りの項目。
- [`docs/internal/TODO-Human.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/TODO-Human.md)
  — 人間専用の項目: 文章の執筆、プロダクトの意思決定、リリース。

TODO 項目をクローズするプルリクエストを歓迎します。PR の説明で該当のセクションに
リンクしてください。
