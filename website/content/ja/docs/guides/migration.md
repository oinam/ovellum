---
title: Ovellum への移行
description: TypeDoc から、手書きの Markdown サイトから、あるいはホスト型ドキュメントプラットフォームから — 何が変わり、Ovellum が何を加え、どうコンテンツを持ち込むか。
sourceHash: 'edba40621b372d50'
---

# Ovellum への移行

ドキュメントがソースから生成されたものでも、手書きの Markdown でも、ホスト型の
プラットフォーム上にあっても、これが Ovellum へ移すための地図です — そしてそうすることで
何が得られるかも。

## 中心となる考え方

Ovellum には 3 つのモードがあり、ドキュメントの出所によって適切なものが決まります:

| モード | 何をするか | 置き換えるもの |
| ---- | ------------ | -------- |
| **`auto`** | TS/JS のソースから毎ビルド Markdown を生成。 | ソース駆動の API ドキュメントジェネレーター。 |
| **`hybrid`** | 生成してから、**手書きのプロースをマージし戻す** — 保護ゾーンが毎回のリビルドを生き延びる。 | 生成と手書きの間のギャップ。 |
| **`manual`** | Markdown を手で書き、Ovellum が静的サイトをビルド。 | ただの Markdown 静的サイトジェネレーター。 |

Ovellum が中心に据えているのは **hybrid** です: 生成されたリファレンスと手書きの物語が
*同じファイル*にあり、プロースが上書きされることも、黙って失われることもありません。
それが、ほかにはない機能です。

## ソース駆動の API ジェネレーターから（例: TypeDoc）

今日 TypeScript から API ドキュメントを生成しているなら、Ovellum の `auto` モードが直接の
等価物です — [ts-morph](https://ts-morph.com/) でソースを解析し、すでに書いている
JSDoc/TSDoc タグ（`@param`、`@returns`、`@throws`、`@example`、`@deprecated`、`@since`、
`@see`、`@remarks`、`@internal` など）を読み、ソースファイルごとに 1 つの Markdown を
出力します。

乗り換える理由は **hybrid モード**です。純粋なジェネレーターは選択を強います: 手編集は
次の実行で消されるので、すべてのプロースは別ファイルに置かれ、同期がずれていきます。
Ovellum では生成ファイルの*中*に、`@manual` ゾーンとして物語を書けます:

```markdown
<!-- @manual:start id="src/client.ts::Client" -->
`Client` は長命です — プロセスごとに 1 つ作って共有してください。プーリングについては
[接続ガイド](/guides/connections/)を参照。
<!-- @manual:end -->
```

ジェネレーターはそのゾーンの*周り*を更新し、*上から*更新することはありません。そして
シンボルをリネーム・削除しても、プロースは捨てられず —
[隔離](/ja/docs/guides/troubleshooting/#リビルド後にプロースが消えた孤立)されて
`.ovellum/orphans/` に入るので、再アタッチできます。その「決して同期がずれないドキュメント」の
保証こそが核心です。

**持ち込み方:** `input` をソースに向け、`mode: 'hybrid'` を設定し、`ovellum build` を実行。
最初のビルドで生成されたリファレンスができます。物語を入れたいところに `@manual` ゾーンを
追加してください。（手編集なしの生成出力だけが欲しいなら `mode: 'auto'` を使います。）

## 手書きの Markdown サイトから

すでにドキュメントが静的サイトジェネレーターでビルドされた Markdown なら、Ovellum の
`manual` モードは本格的な静的サイトビルダーです — `.md` ファイルを入れるだけで、標準で
こうしたものが手に入ります:

- ファイルツリーからの**ナビゲーション**（フォルダ → セクション）。順序・タイトル・
  折りたたみは `_meta.json` で。きれいな URL、右側の自動目次。
- **テーマ設定** — ちらつきのない light/dark、5 つのパレットに加え
  [ホストを継承する](/ja/docs/guides/themes/#ホストプロジェクトのデザインを継承する)
  `bare` モード、設定可能なアクセント、システムまたはバンドルのフォント。
- **オーサリング** — GitHub 風のコールアウト、脚注、
  [コンポーネントディレクティブ](/ja/docs/guides/components/)（tabs/steps/cards）、
  Mermaid 図、コピーボタン付きの Shiki シンタックスハイライト。
- **[検索](/ja/docs/guides/search/)**（Pagefind、⌘K）、**[i18n](/ja/docs/guides/i18n/)**
  （ロケールごとのサブツリー + 言語ピッカー）、**[バージョン管理](/ja/docs/guides/versioning/)**、
  **[ドラフト](/ja/docs/guides/drafts/)**、ランディングページ、テーマ付き 404、`sitemap.xml`
  + RSS、ページごとの読了時間／「Edited」日付。
- **[AI フレンドリーな出力](/ja/docs/guides/automation/)** — `llms.txt`、`llms-full.txt`、
  各ページの `.md` ミラーを HTML と並べて出力。

完全なツアーは [manual モード](/ja/docs/guides/manual-mode/)を参照。

**持ち込み方**（下記の[手順](#コンテンツを持ち込む)を参照）: Markdown をコンテンツ
ディレクトリにコピーし、古いナビ設定をフォルダごとの `_meta.json` に変換し、フロントマター
（`title`、`description`、`tags`、`permalink`）を保持または追加し、`ovellum check` で
リンク切れを捕まえます。

## エージェント生成の wiki から

新しいタイプのツール（例えば OpenWiki）は、LLM エージェントにコードベース*について*の
Markdown wiki をリポジトリ内のフォルダに書かせます — アーキテクチャノート、ワーク
フロー、クイックスタート。有用な文章ですが、ただのファイルの集まりです: レンダラー
なし、リンクチェックなし、検索なし、公開の手段なし。

Ovellum の manual モードは、ジェネレーターのワークフローに触れることなく、その
フォルダを本物のドキュメントサイトに変えます:

```ts
// ovellum.config.ts
export default {
  name: 'wiki',
  mode: 'manual',
  input: 'openwiki', // 生成された wiki をそのまま指す
  output: 'dist',
  site: { title: 'Project wiki' },
} satisfies OvellumUserConfig;
```

`ovellum build` はフォルダ構造からのナビゲーション、検索、テーマ、`llms.txt` と
ページごとの `.md` ミラーを与え、`ovellum check` は wiki 内部のリンクを検証します
（エージェントもリンク切れを書きます）。wiki ツールは Markdown を更新し続け、
Ovellum はそれをレンダリングし続けます。

さらに進めるなら: ドキュメントの*リファレンス*部分がエージェントの記述ではなく
ソースから来るべきなら、[hybrid モード](/ja/docs/guides/hybrid-mode/)に切り替え、
エージェントには MCP サーバーの保護ゾーンを通じて書かせてください —
[エージェントにドキュメントを書かせる](/ja/docs/guides/automation/#エージェントにドキュメントを書かせる)を参照。

## ホスト型ドキュメントプラットフォームから

ドキュメントがホスト型のプラットフォーム上にあるなら、移行は機能と同じくらい
**所有権**の話です。Ovellum は**ポータブルな静的フォルダ**をビルドします — プレーンな
HTML/CSS と少しの JS — それをどこへでもデプロイできます: GitHub Pages、Netlify、Vercel、
Cloudflare、S3 バケット、あるいはホストツール独自のパイプライン。生かし続けるサーバーサイドの
ランタイムはなく、出力に独自仕様のものはありません。

保持できるもの — あるいは得られるもの:

- **コンテンツはリポジトリ内のプレーンな Markdown のまま。** エクスポート手順も、後で
  逃れるべき独自フォーマットもありません。
- **[デフォルトで AI ネイティブ](/ja/docs/guides/automation/)** — 組み込みの
  [MCP サーバー](/ja/docs/guides/automation/#mcp-サーバー)（`ovellum mcp`、MCP レジストリに
  掲載）により、エージェントは検索・読み取り・diff だけでなく、**再生成を生き延びる保護ゾーンへ
  書き込む**こともできます — 読むだけではありません。加えて機械可読な `--json` と安定した
  終了コード。
- **ロックインなし** — ビルドこそが成果物で、ホストはあなたの選択です。（Ovellum は
  ビルドし、ホストがデプロイします。）

**持ち込み方:** ページを Markdown にエクスポートして `content/` に置き、下記の手順に従います。
多くのホスト型プラットフォームは十分に近い Markdown をエクスポートするので、主な作業は
ナビ（`_meta.json`）とアセットパスを
[ルート絶対](/ja/docs/guides/troubleshooting/#ビルド済みサイトで画像やリンクが壊れている)に
直すことです。

## コンテンツを持ち込む

どこから来ても、同じひと握りの手順です:

1. **スキャフォールド** — `ovellum init` がコメント付きの `ovellum.config.ts`、スターターの
   `content/index.md`、`AGENTS.md`、`.gitignore` エントリを書き出します。`--yes` で
   デフォルトを受け入れます。
2. **Markdown を入れる** — `.md` ファイルを設定済みの `input`（デフォルト `content/`）の下に
   置きます。サブフォルダはサイドバーのセクションになり、各ファイルは `<slug>/index.html` の
   ページになります。ルートに既存の `README.md` があれば自動的にホームページになります。
3. **ナビの順序付け** — 特定の順序やタイトルが欲しいディレクトリに `_meta.json` を追加:
   `{ "title": "Guides", "order": ["install", "configure"] }`。未掲載のページはその後に
   アルファベット順で並びます。どこでも任意です。
4. **フロントマター**（すべて任意） — `title`、`description`、`tags`、`permalink`
   （`/faq/` のようなカスタム URL）、`draft: true`（`dev` で表示、`build` から除外）、
   `updated`（「Edited」日付を固定）。タイトルは最初の `# H1`、次にファイル名へフォール
   バックします。
5. **アセットパスを直す** — 画像／ダウンロードのリンクを**ルート絶対**（`img/x.png` ではなく
   `/img/x.png`）にして、きれいな URL でも壊れないようにします。ルートで配信するファイル
   （favicon、`robots.txt`）は `public/` に置きます。
6. **検証** — `ovellum check` がリンク切れの内部リンクを報告します（問題があれば終了 `1`、
   `--strict` でさらに、`--json` は CI 向け）。そして `ovellum build` して `dist/` をデプロイ。

途中で問題が起きたら、[トラブルシューティングガイド](/ja/docs/guides/troubleshooting/)が
よくあるつまずきをカバーします。
