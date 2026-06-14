---
title: 手動モードのサイトを構築する
description: Markdown ファイルのフォルダから、デプロイ可能な静的サイトへ。
sourceHash: 'ec830eefb886f71c'
---

# 手動モードのサイトを構築する

手動モードは最もシンプルなパイプラインです。あなたは Markdown を書き、Ovellum は
HTML、CSS、そしてごくわずかな JavaScript を生成します。ソースの解析も、
マージエンジンも、孤立ブロックのアーカイブもありません — ただレンダリングするだけです。

## 最小構成のプロジェクト

```
my-docs/
  ovellum.config.json
  content/
    index.md
    getting-started.md
```

設定:

```json
{
  "mode": "manual",
  "input": "./content",
  "output": "./dist",
  "site": {
    "title": "My docs"
  }
}
```

ビルド:

```bash
npx ovellum build
```

結果:

```
dist/
  index.html
  getting-started/index.html
  assets/
    ovellum.css
    ovellum.js
```

きれいな URL がデフォルトです。すべてのページは `<slug>/index.html` になるので、
URL は `/<slug>/` となります。サーバー側のリライトは不要で、どんな静的ホストでも
動作します。

上記のどちらのファイルにもフロントマターはなく、`_meta.json` もどこにもないことに
注目してください — どちらも任意です。スラグはファイル名から、タイトルは最初の
`# H1` から決まります。[ナビゲーションを追加する](#adding-navigation)を参照してください。

## ナビゲーションを追加する

サイドバーはファイルツリーから自動的に構築されます — **設定は不要です。**
全体の構造は次の 2 つのルールでカバーされます:

- **スラグ = `.md` を除いたファイル名。** `orphans.md` → `/orphans/`。サブフォルダは
  ネストします: `guides/install.md` → `/guides/install/`。`index.md` は独自のスラグを
  持たず、それが属するフォルダを表します。
- **各サブフォルダはセクション**であり、フォルダ名をタイトルケースにしたものが
  タイトルになります: `getting-started/` → "Getting started"。

**ホームページ**（`/`）は自動的に解決されます: `index.md`、なければルートの
**`README.md`** — 既存のリポジトリの README が設定なしでドキュメントのホームになります。
別のファイルを使うには [`site.home`](/ja/docs/reference/config/) を設定し
（例: `"overview.md"`）、README を完全に除外するには `ignoreFiles` に追加します。

セクションはサイドバーで**デフォルトで折りたたまれます**（クリックで展開します）—
今いるページを含むセクションは開いたままなので、常に自分の現在地が分かります。
すべて展開しておきたい場合は [`site.sidebar.collapse: false`](/ja/docs/reference/config/)
を設定してください。

ページタイトルは次の順で解決されます:

1. 設定されていれば、フロントマターの `title:` フィールド。
2. なければ、本文の最初の `# H1`。
3. 最後の手段として、ファイル名（`getting-started.md` → "Getting started"）。

つまり**フロントマターは任意です** — ページは `# 見出し` とそれに続く内容だけで
構いません。その見出しがページ上のタイトル、サイドバーのラベル、*そして*
`<title>` タグになります。何かを上書きしたい場合にのみフロントマターを追加します:

- **`title`** — タイトル、サイドバー、`<title>` について H1／ファイル名を上書きします。
- **`description`** — `<meta name="description">` を設定します。
- **`tags`** — リスト → `<meta name="keywords">`。
- **`permalink`** — ページのカスタム URL（例: `permalink: /faq/`）。
- **`draft: true`** — [ドラフト](/ja/docs/guides/drafts/)（`dev` では表示され、
  `build` からは除外されます）。
- **`updated`** — **Edited** の日付を固定します（例: `updated: 2026-05-20`）。
  git／ファイルシステムの参照を上書きします。表示される日付を、git の挙動ではなく
  意味のある編集を反映させたいときに使います。

### `_meta.json` で制御する（任意）

`_meta.json` は**決して必須ではありません。** 自動的な順序やフォルダ名のセクション
タイトルを上書きしたい場合にのみ、ディレクトリに置きます:

```
content/
  guides/
    _meta.json
    install.md
    configure.md
    deploy.md
```

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

- `title` は（タイトルケースの）フォルダ名を上書きします。
- `order` はスラグ（`.md` を除いたファイル名 / サブフォルダ名）のリストです。
  リストにないものは、明示的に指定された集合の後にアルファベット順で並びます。
- `collapse` はこのフォルダについてサイドバーの [`site.sidebar.collapse`](/ja/docs/reference/config/)
  のデフォルトを上書きします: `false` は常に展開、`true` は常に折りたたみです。
- `hidden: true` はそのフォルダ（とその下のすべて）をビルドから除外します。

`_meta.json` がなければ、フォルダのページは単にアルファベット順に並びます —
多くの場合、まさにそれが望むものです。

### ページとフォルダを除外する

公開サイトからコンテンツを除外する方法は 4 つあり、広い範囲から狭い範囲の順に並びます:

- **`site.ignoreFolders`** — 設定でフォルダ*名*をリストすると、それらを完全に除外
  します（サイドバーへの登録なし、レンダリングなし、コピーなし）。どの階層でも
  一致します:

  ```json
  { "site": { "ignoreFolders": ["drafts", "internal"] } }
  ```

- **`site.ignoreFiles`** — 個別のファイル（Markdown ページ*および*パススルーの
  アセット）を、編集せずに除外するためのファイル**グロブ**です。スラッシュなしの
  パターンはどこにあってもベース名に一致し、スラッシュ付きのパターンは `input` からの
  相対パスに一致します:

  ```json
  { "site": { "ignoreFiles": ["README.md", "*.draft.md", "drafts/**"] } }
  ```

- **`_meta.json` の `"hidden": true`** — フォルダがその場で自身を除外できるようにします:

  ```json
  { "hidden": true }
  ```

- **フロントマターの `draft: true`** — 単一のページを非公開にします:

  ```markdown
  ---
  title: Work in progress
  draft: true
  ---
  ```

4 つすべてがサイドバー**と**ビルドからコンテンツを除外し、`build` と `check` の
両方がこれらを尊重します（そのため `check` は除外されたファイルを決して
リントしません）。Markdown を含まないアセットのみのフォルダは自動的にサイドバーから
除外される一方で、そのファイルは `dist/` にパススルーされ続けます。予約された
[`public/`](#static-assets) フォルダは特別です — 出力のルートにコピーされます
（下記の「静的アセット」を参照）。

**プロジェクトのルートから実行していますか？** `input: "."` で問題ありません —
ドットファイル、`node_modules`、パッケージのマニフェスト/ロックファイル、
`ovellum.config.*`、そして出力ディレクトリそのものは**常に**自動的に除外されるので、
これらがビルドに漏れることはありません。それ以外のもの（リポジトリの `README.md` など）
には `ignoreFiles` を使ってください。

## コールアウト

ラベル付きのコールアウトは 5 種類 — `[!NOTE]`、`[!TIP]`、`[!IMPORTANT]`、
`[!WARNING]`、`[!CAUTION]` — GitHub 風のアラート引用ブロックを書くことで
レンダリングされます:

```markdown
> [!NOTE]
> Background context that's useful but skippable.

> [!TIP]
> A shortcut or a sharper way of doing the thing above.

> [!IMPORTANT]
> Something the reader has to internalize before going further.

> [!WARNING]
> Footgun. Action causes mild damage.

> [!CAUTION]
> Footgun. Action causes severe damage. Data loss, broken state, etc.
```

それぞれが、色付きの左罫線、小さな大文字のラベル、そして本文を持つパネルとして
レンダリングされます。中にはあらゆるインライン Markdown を混在させられます —
リンク、コードスパン、ネストしたリストまで。

> [!NOTE]
> このようにです。構文が一致するとラベルが消えます。一致しなければ、ただの引用
> ブロックになります — 短いプルクオートに便利です。

> [!TIP]
> ソース上で見た目をすっきり区切りたい場合は、`[!TYPE]` マーカーを単独の行に置き、
> 本文の前に空の引用ブロック行を 1 行入れてください。

> [!WARNING]
> コールアウトは控えめに使ってください — 1 ページに 3 つで十分です。読者の流れを
> 中断させるためのものなので、それぞれが中断に値する必要があります。

## 脚注

標準的な Markdown の脚注記法を使えます — 本文中に `[^id]` という参照を置き、
ファイル内のどこかに対応する `[^id]:` という定義を書きます。

```markdown
Ovellum は生成されたドキュメントと手書きのドキュメントを 1 つのファイルで
マージし[^merge]、純粋な手動ドキュメント向けの静的サイトビルダーも備えています[^manual]。

[^merge]: マージエンジンは再生成時も保護ゾーンをそのまま保ちます。
[^manual]: まさにこのページがその方法で構築されています。
```

参照は小さな上付き文字としてレンダリングされ、脚注へリンクします。各脚注には
読んでいた場所へ戻る `↩` リンクが付きます。`id` は単なるラベルです — 単語
（`[^merge]`）でも数字（`[^1]`）でも、ソースで読みやすいほうを使ってください。
番号は定義を書いた順ではなく、参照がページ内で*最初に現れる*順に振られ、すべての
脚注はページ末尾のうっすらと色のついたパネルにまとめられます。

上の例を実際にレンダリングするとこうなります[^merge]。番号付けを示すために
2 つ目の参照も置いています[^manual]。

[^merge]: マージエンジンは再生成時も保護ゾーンをそのまま保ちます。
[^manual]: このページは手動モードで構築されています。

## 右側の目次を追加する

有効にするものは何もありません — 右の列は、各ページの `## h2` と `### h3` の見出しから
自動的に生成されます。各見出しにはホバー時にクリック可能な `#` アンカーも付くので、
読者はディープリンクを張れます。

これらすべてに設定行は 1 行も要りません。Markdown を書けば、機能する目次が手に入ります。

## 静的アセット

> 全体像 — 画像、動画/音声の埋め込み、PDF やその他のダウンロード — については
> [**アセットとダウンロード**](/ja/docs/guides/assets/)ガイドを参照してください。要点は次のとおりです:

`content/` 内の `.md` ファイル以外のものはすべて、そのままパススルーされます:

```
content/
  images/
    architecture.svg
    screenshot.png
  hello.md
```

Markdown 内では相対パスでアセットを参照します:

```markdown
![Architecture](/images/architecture.svg)
```

ビルド後:

```
dist/
  images/
    architecture.svg
    screenshot.png
  hello/index.html
```

### 予約された `public/` フォルダ → サイトルート

**[`publicDir`](/ja/docs/reference/config/)**（デフォルトは `public`）は、
**出力のルート**にコピーされる**予約**フォルダです — Next、Astro、Vite、Hugo
（`static/`）でおなじみの慣習です。サイトのルートに存在しなければならないファイル
（`favicon.ico`、`robots.txt`、`CNAME`、OG 画像）や、その他の静的アセットの置き場所です:

```
content/
  public/
    favicon.ico        →  /favicon.ico
    robots.txt         →  /robots.txt
    fonts/Geist.ttf    →  /fonts/Geist.ttf
```

この中身は一切処理されません（ページもサイドバーへの登録もなし — `.md` でさえ
そのままコピーされます）。`site.publicDir` で名前を変更できます。（上記の `images/`
の例のように `public/` の*外*にある静的ファイルは、自身のパスを保ったまま
パススルーされ続けます。）

## ランディングページ <a id="landing"></a>

手動モードには、マーケティング風のホームページがオプションで付属します。`/` での
挙動は 1 つのフラグで決まります:

- `site.landing.enabled: false`（デフォルト）— `/` は単なるドキュメントページです。
  `content/index.md` を通常のレイアウト（サイドバー、コンテンツ、このページの目次）で
  レンダリングします。読者にドキュメントへ直接到達してほしい場合に使います。
- `site.landing.enabled: true` — `/` はマーケティング風のページになります: ヒーロー、
  機能グリッド、任意の `_landing.md` の本文、任意のトラストストリップ。トップバーには
  "Docs" リンクが増え、読者は常にワンクリックでドキュメント本体へ入る経路を持てます。
  そしてビルドは警告とともに `content/index.md` を無視します（その本文を `_landing.md` に
  移すか、ファイル名を変更してください）。

> [!TIP]
> ランディングオンからランディングオフに切り替える場合は、`_landing.md` を `index.md`
> にリネーム（または新しい `index.md` を作成）して、`/` に内容が残るようにしてください。

有効にすると、設定は次のようになります:

```json
{
  "site": {
    "landing": {
      "enabled": true,
      "docsHref": "/getting-started/",
      "hero": {
        "title": "My project",
        "subtitle": "What it does in one sentence.",
        "ctas": [
          { "label": "Get started", "href": "/getting-started/" },
          { "label": "GitHub", "href": "https://github.com/me/proj", "style": "secondary" }
        ]
      },
      "features": [
        { "title": "Fast", "description": "Builds in seconds." },
        { "title": "Themed", "description": "Auto/light/dark out of the box." }
      ]
    }
  }
}
```

`content/_landing.md` ファイルがあれば、その本文が機能グリッドとトラストストリップの
間にレンダリングされます。「なぜ（Why）」のセクションとして扱ってください。

ランディングの完全なリファレンス: [config → site.landing](/ja/docs/reference/config/#sitelanding)。

## 404 ページ

**すべてのビルドに 404 ページが付属します** — 自分で書く必要はありません。書かなければ、
Ovellum はテーマに合った既定の「ページが見つかりません」を生成します（ホームへの
リンク付き）。カスタマイズするには `content/404.md` ファイルを追加します — 普通の
Markdown ページなので、好きなように書いてください（短いお詫び、ホームへ戻るリンク、
検索プロンプトなど）:

```markdown
---
title: Page not found
---

# Page not found

That page doesn't exist. Head back to the [documentation](/).
```

これは通常のドキュメントではなく、**特別なページ**として扱われます:

- 中央寄せの、より狭い列に、より大きな見出しでレンダリングされ、サイドバー、
  このページの目次、パンくず、前/次、このページを編集するリンクはすべて隠されます —
  行き止まりなので、ナビゲーションの装飾を落とします。
- **読み進める流れ**からは除外されます: サイドバー、`sitemap.xml`、RSS フィード、
  前/次の隣接ページとして決して現れません（そのため最初の実ページの「前へ」は
  404 ではなく空になります）。

ビルドはこれを **`dist/404/index.html`（きれいな URL）と、トップレベルの
`dist/404.html` の両方**として出力します。後者は、多くの静的ホスト（GitHub Pages、
Netlify、Cloudflare、…）が見つからない URL に対して提供するファイルです — そのため、
追加の手順なしに本番でカスタム 404 が発火します。開発サーバー
（`ovellum dev` / `ovellum serve`）も見つからないパスに対してこれを提供するので、
ローカルでも同じように振る舞います。

> [!NOTE]
> サブパス（`site.basePath`）から提供されるホストでも 404 は機能します — その中の
> 内部リンクは、他のすべてのページと同様にプレフィックスが付きます。

## テーマの切り替え

既定のテンプレートには 3 つのテーマが付属します: `auto`（OS に従う）、`light`、`dark`。
トップバーのトグルがこれらを循環します。選択は `localStorage` に記憶され、描画前に
適用されるので、その後の読み込みでテーマのちらつきはありません。

初回訪問者向けに別のデフォルトを提供したい場合は、`site.defaultTheme` を `light` か
`dark` に設定します。デフォルトを超えたスタイリングについては
[テーマ](/ja/docs/guides/themes/)を参照してください。

## 静的サイトの基本要素

既定のテンプレートには、重要な事柄に対する妥当なデフォルトが付属しています:

- 同じ OKLCH パレットからのライト + ダークテーマ。
- システムフォントのみ — `@font-face` なし、FOIT なし。
- shiki によるビルド時のシンタックスハイライト。コードに対するランタイム JS はゼロ。
- 描画前のテーマスクリプト（再読み込み時のちらつきなし）。
- すべてのコードブロックにクライアント側で注入されるコピーボタン。
- レスポンシブなグリッド: 狭いビューポートではまずサイドバーが下に移り、次に
  折りたたまれます。
- アクセシブル: フォーカスリング、セマンティックなランドマーク（`<header>`、`<main>`、
  `aria-label` 付きの `<aside>`）、適切な見出しレベル。

すべては生成されたものです。ここにあるものは現時点では設定できません。
[テーマガイド](/ja/docs/guides/themes/)で、今日カスタマイズできるものを取り上げています。
