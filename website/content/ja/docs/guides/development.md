---
title: 開発
description: 日々のループ — 雛形作成、執筆、監視、チェック、ビルド、デプロイ。
sourceHash: '89fceb6b556d403a'
---

# 開発

Ovellum サイトでの作業 — 雛形作成、執筆、変更時のリビルド、リンクのチェック、そして
出荷前のローカルでの出力の提供 — についての実践的なガイドです。

デプロイ先については[デプロイガイド](/ja/docs/guides/deploy/)へ進んでください。
Ovellum 自身のリポジトリ（モノレポ、パッケージ、テスト）については
[コントリビュート](/ja/docs/contributing/)を参照してください。

## 前提条件

- **Node 20 以降** — Ovellum は Node 20 LTS を対象としています。
- **パッケージマネージャー** — pnpm、npm、yarn のいずれも動作します。以下のコマンドは
  npm に同梱されている `npx` を使います。お好みで `pnpm dlx` や `yarn dlx` に
  置き換えてください。

Ovellum をグローバルにインストールする必要はありません。`npx ovellum <command>` は
初回実行時にダウンロードしてキャッシュします。以降の実行はキャッシュを使います。

## 新しいサイトの雛形を作る

```bash
mkdir my-docs && cd my-docs
npx ovellum init
```

init のプロンプトは、プロジェクト名、モード（ドキュメントサイトなら `manual`、
API 生成なら `auto`、両方なら `hybrid`）、タイトル、説明、入出力のパス、そして
デフォルトのテーマを尋ねます。とりあえず試すだけなら、Return を押してデフォルトを
通過してください。

非対話的な雛形作成（すべてがデフォルトを取る。CI やちょっとしたスクリプトに便利):

```bash
npx ovellum init --yes
```

書き込まれるファイル:

- `ovellum.config.json` — 唯一の設定ファイル。
- `content/index.md` — 開始用のページ（手動モードとハイブリッドモードのみ）。
- `.gitignore` — なければ `dist/` と `.orphans/` が追記されます。

フラグの一覧と終了コードについては
[`init` の CLI リファレンス](/ja/docs/reference/cli/#ovellum-init)を参照してください。

## 執筆

`input/` ディレクトリ（デフォルトは `content/`）の下のどこにでも `.md` ファイルを
置きます。構造:

```
content/
  index.md              ← becomes /
  getting-started.md    ← becomes /getting-started/
  guides/
    install.md          ← becomes /guides/install/
    deploy.md           ← becomes /guides/deploy/
  _meta.json            ← optional: directory title + page order
```

ページのタイトル、説明、その他のメタデータは YAML フロントマターに書きます:

```markdown
---
title: Getting started
description: Install Ovellum and build your first docs.
---

# Getting started

…
```

ディレクトリごとの `_meta.json` がグルーピングと順序を制御します:

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

完全な仕様については、設定リファレンスの
[`_meta.json`](/ja/docs/reference/config/#_metajson-per-directory-manual-mode)を
参照してください。

## `ovellum dev` で反復する

dev コマンドは執筆ループの心臓部です。1 つのコマンドがすべてを行います: 初回ビルド、
変更の監視、`http://127.0.0.1:3000/` での提供、そしてリビルドのたびに開いている
ブラウザタブを自動更新します。

```bash
npx ovellum dev
```

何が起きるか:

- 起動時の**初回ビルド**。
- **HTTP サーバー**が次に利用可能なポートで起動します（デフォルトは 3000。
  使用中なら繰り上がります）。
- **ウォッチャー**が `input/` 下のすべての変更でリビルドを実行します — 300 ms の
  デバウンス付きで、`chokidar` の `awaitWriteFinish` が有効なので、エディタからの
  部分的な書き込みが中途半端な状態のリビルドを引き起こすことはありません。
- **ライブリロード**がビルドが成功するたびに、接続中のすべてのブラウザタブへ
  Server-Sent Event を送ります。HTML レスポンスに注入された小さなクライアント
  スクリプトが `location.reload()` を呼び出します。
- **設定のリロード** — `ovellum.config.*` 自体が変わると、次のビルドが新しい設定を
  取り込みます。
- `Ctrl-C` での**クリーンなシャットダウン**。

表示された URL を開いて編集を始めてください。保存 → 約 100 ms 以内にページが更新される
のが見えます。

### フラグ

```bash
npx ovellum dev --port 4000          # pick a port
npx ovellum dev --host 0.0.0.0       # expose on the local network
npx ovellum dev --cwd ./website      # multi-site monorepo
```

フラグの一覧については[`dev` の CLI リファレンス](/ja/docs/reference/cli/#ovellum-dev)を
参照してください。

## 手動の 2 プロセスループ（任意）

`ovellum dev` は一般的なケースをカバーします。自分のサーバー（CDN エミュレータ、
リバースプロキシ、ウォッチャーを再起動するプロセスマネージャー）を動かしたい場合は、
プリミティブも引き続き利用できます:

```bash
# Terminal 1: watch only
npx ovellum watch

# Terminal 2: serve the dist/ directory
npx ovellum serve

# …or any other static server you prefer:
npx serve dist
python3 -m http.server -d dist 8000
npx http-server dist -c-1     # -c-1 disables caching
```

`ovellum serve` は純粋な静的サーバーです — 監視もリロードの注入もありません。
キャッシュヘッダーは `public, max-age=0` なので、更新時には常に最新のビルドを
取得します。

## 出荷前にチェックする

`ovellum check` はリントパスです: 書き込みはなく、何かおかしければ非ゼロで終了します。
現在は次を検出します:

1. **壊れた内部リンク** — サイドバーのページに解決されない任意の `/foo/` や
   `./bar.md`。
2. **安全でない URL スキーム** — `javascript:`、`vbscript:`、`data:`、`file:`。
   これらはいずれにせよレンダリング時に除去されますが（[セキュリティ](/ja/docs/reference/security/)を
   参照）、`check` は著者が気づいて削除できるよう、`[SECURITY]` の問題として
   浮かび上がらせます。

```bash
npx ovellum check
```

出力は行番号付きのファイルごとの小さな表です。`build` と並べて CI に組み込めば、
リンク切れが出荷される前に捕まえられます。

正確な出力の形と終了コードについては、
[`check` の CLI リファレンス](/ja/docs/reference/cli/#ovellum-check)を参照してください。

## 本番向けにビルドする

`ovellum build` はデプロイパイプラインが実行するものです:

```bash
npx ovellum build
```

手動モードでは、次を生成します:

- `dist/*.html`（およびきれいな URL のための `index.html` を持つネストした
  ディレクトリ）。
- `dist/assets/ovellum.css` + `dist/assets/ovellum.js`。
- `site.baseUrl` が設定されているときの `dist/sitemap.xml`。
- `site.search.enabled` が `true` のときの `dist/pagefind/`。
- `dist/404/index.html` と（ビルド後スクリプト経由で）`dist/404.html` — あなたの
  ホストが探すほう。

ビルド出力は、同じ入力が与えられれば完全に決定的です。連続した 2 回の実行は
バイト単位で同一のファイルを生成します。

## 推奨ワークフロー

ループ全体を端から端まで:

```bash
npx ovellum init             # once, when starting
git init && git add . && git commit -m 'scaffold'

npx ovellum dev              # while writing — keep running

npx ovellum check            # before committing
npx ovellum build            # once, before pushing — confirms a cold build works

git add . && git commit -m 'docs: explain how the merger works'
git push                     # CI runs `ovellum build` and deploys
```

dev ループには 1 つのターミナル、やりくりは不要です。

## 1 つのリポジトリで複数のサイトを扱う

リポジトリがコードとドキュメントの両方を持つ場合（例えばモノレポ）、`--cwd` を渡して
各 Ovellum コマンドをサブディレクトリにスコープします:

```bash
npx ovellum dev   --cwd ./website
npx ovellum build --cwd ./website
npx ovellum check --cwd ./website
```

`ovellum.config.json` 内のすべてのパスはその `--cwd` からの相対で解決されるので、
リポジトリを共有しつつ、ドキュメントを完全に自己完結させられます。

## 次に何を読むか

- [デプロイガイド](/ja/docs/guides/deploy/) — GitHub Pages、Netlify、Vercel、
  Cloudflare、Nginx、S3、どこへでも。
- [テーマ](/ja/docs/guides/themes/) — 何が同梱され、何をカスタマイズし、アイコン
  レジストリがどう機能するか。
- [設定リファレンス](/ja/docs/reference/config/) — すべてのフィールド、すべての
  デフォルト。
