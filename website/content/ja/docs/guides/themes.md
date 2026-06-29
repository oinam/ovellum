---
title: テーマ設定
description: デフォルトテーマの構成、オーバーライドの方法、そしてトップバー・ヒーロー・アイコンシステムが標準で提供するもの。
sourceHash: '424e1cfd9a42ead6'
---

# テーマ設定

デフォルトのサイトテンプレートには、小さくも明確な意図を持ったデザインシステムが付属しています。OKLCH パレット、流動的な Utopia の型・スペーススケール、システムフォント、auto/light/dark テーマ、アイコンセット、そして控えめな背景画像を備えた中央寄せのヒーロー。すぐに使え、CSS を一行も書かずに完成度の高い見た目が手に入ります。

このページでは、テーマがどう構成されているか、そして最もよくオーバーライドしたくなる部分をどう上書きするかを説明します。

## トークンモデル

すべての色は、3 つのレイヤーのいずれかに属する CSS カスタムプロパティであり、それぞれが上位のレイヤーの上に構築されています。

- **プリミティブ — 1 本のニュートラルランプ。** `--color-gray-50` から `--color-gray-950` まで、加えて `--color-white` / `--color-black`。生の色の値が存在するのは*ここだけ*です。デフォルトテーマは純粋なニュートラルグレーのランプを使います。この 11 個の値を変更すれば、あらゆる面（サーフェス）とテキストの色がそれに従います。ほかに触るファイルはありません。
- **ロール — 「ブランド」。** `--color-primary`、`--color-secondary`、`--color-accent`。それぞれに `-fg`（その上に乗るテキスト）と `-hover` のバリアントがあります。デフォルトではこれらをグレーにマッピングしています。ロールを色のランプ（たとえば赤）に向ければ、すべてのボタン・リンク・フォーカスリングがスキンし直されます。グレー以外のロールは light と dark で異なる値を持つことができます。
- **セマンティック — サーフェス + テキスト。** `--color-bg`、`--color-surface`、`--color-fg`、`--color-border`、コールアウト系のトークンなどで、ランプ上にマッピングされます。コンポーネントはロールとセマンティックを参照し、ランプを直接参照することはありません。

ダークモードは、**同じランプを反転したステップに再マッピングしたもの**です。ダーク専用の色の*値*は存在せず、ロールとサーフェスをグレーランプの反対側の端に向ける小さなブロックがあるだけです（`--color-bg` → 暗いグレー、`--color-fg` → 明るいグレー。エレベーションは反転するので、「浮き上がった」サーフェスは*より明るく*なります）。ランプを一度変更すれば、両方のテーマが一緒に更新されます。

トークンの*アーキテクチャ*（名前、レイヤー構成、スケール）はプロジェクトの [`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md) にあります。テーマごとの色の*値*はテーマのスタイルシート（[`templates/default/style.css`](https://github.com/oinam/ovellum/blob/main/packages/site/src/templates/default/style.css)）にあります。

## 利用可能なテーマ

ページ全体に適用される 5 つのパレットがバンドルされており、それぞれに light **と** dark のバリアントがあります（light/dark/auto モードは独立した選択肢のままです）。**Ovellum** がデフォルトで、残りはピッカーと同様にアルファベット順に並びます。

| テーマ        | 備考                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| **Ovellum**   | モノクロ、純粋なニュートラルグレーのランプ（`palette: 'default'`）。このサイトが使っているテーマです。 |
| **E-ink**     | 温かみのある紙 + インクの黒、最大コントラストのモノクロ — 電子書籍リーダーのような見た目。色のアクセントはなく、`site.font: 'serif'` と特に相性が良いです。 |
| **Flexoki**   | 温かみのあるインキーな紙のトーン。[Flexoki](https://stephango.com/flexoki) にちなんでいます。 |
| **Nord**      | 北極のブルーグレー — Snow Storm の light、Polar Night の dark、Frost のアクセント。 |
| **Solarized** | Ethan Schoonover のベーストーン。クリームの light、深いティールの dark。       |

各パレットは、上記のトークンモデルが約束するとおりに実装されています。ロールが指す同じ 11 ステップのグレーランプをスキンし直すので、dark バリアントは反転ランプの再マッピングから自動的に得られます。サーバーレンダリングされるデフォルトは [`site.palette`](/ja/docs/reference/config/) で設定します。訪問者はトップバーの外観コントロールから実行時に切り替えられます（`localStorage` に保存され、描画前に適用されます）。コードブロックのシンタックステーマは独立しており、[`site.codeTheme`](#コードブロックのテーマ) で選択できます。

Ovellum 独自のパレット（**Ovellum**、**E-ink**）は、背景とテキストに絶対的な黒や白を意図的に使いません（純粋な `#000` on `#fff` は目に厳しいためです）。一方、標準パレット（**Flexoki**、**Nord**、**Solarized**）はそれぞれの公開された値を忠実に再現します。

## タイポグラフィ

### フォント

フォントのロールは CSS 変数です。`--font-sans`（本文 + 見出し）、`--font-mono`（コード）、`--font-serif`（serif オプション）。実際に使われる本文フォントは `--font-body` で、`site.font` から設定され、訪問者がライブで上書きできます。

デフォルトは **システムフォントのみ**を読み込みます — 即座に最初の描画が行われ、ウェブフォントの往復がありません。

#### 組み込みのフォントピッカー

[`site.font`](/ja/docs/reference/config/) は **4 つ**の値を取り、外観コントロールは同じセットをライブの**フォント**ピッカーとして公開します。

| 値        | フォント                          | ウェブフォントを読み込む？       |
| --------- | --------------------------------- | -------------------------------- |
| `'sans'`  | システムの sans-serif スタック（デフォルト） | いいえ                       |
| `'serif'` | システムの serif（Georgia など）  | いいえ                           |
| `'inter'` | Inter                             | はい — **バンドル済み**、オンデマンド |
| `'geist'` | Geist                             | はい — **バンドル済み**、オンデマンド |

Inter と Geist は**テンプレートの中に**同梱されており（`/assets/fonts/` から配信）、ホスティングするものは何もありません。それらの `@font-face` ルールは仕様上 レイジー です。ファイルが取得されるのは、ページが実際にそのファミリーでレンダリングされるとき、つまり `site.font` がそれに設定されているか、訪問者がそれを選んだときだけです。だからデフォルトのサイトはウェブフォントゼロで高速なまま保たれ、コストはオプトインしたときだけ支払われます。（コードはどちらにしても等幅のままです。）

バンドルされている両ファミリーは **SIL Open Font License 1.1** の下にあり、これはソフトウェア内での再配布を許可しています。だから Ovellum はそれらを同梱でき、あなたのビルドはライセンスの懸念なくそれらを配信できます。

#### 自分のフォントを持ち込む

バンドルされた 2 つ以外のファミリーを使うには、[`site.font`](/ja/docs/reference/config/) をキーワードではなく**オブジェクト**に設定します。Ovellum はそれをデフォルトにし、あなたの `@font-face` スタイルシートを読み込み、読者のピッカーに追加します — `headExtra` は不要です。Google Fonts のリンクよりも**セルフホスティングを推奨**します。第三者への接続を避けられ、訪問者の IP をフォント CDN に送るというプライバシー / GDPR の懸念も避けられます。そして昔の「共有ブラウザキャッシュ」の論拠はもはや成り立ちません（ブラウザはキャッシュをサイトごとに分割するようになりました）。

> **まずライセンスを確認してください。** セルフホスティングとは*あなた*がフォントファイルを配信するということなので、ライセンスがウェブ埋め込みを許可しているものだけを使ってください。Open Font License（OFL）のファミリー — バンドルされている Inter や Geist のような — は常に安全です。一部の「無料」フォントは自分のサイトに埋め込むのは無料でも、**再配布が許可されていない**場合があります。それらを自分でセルフホストするのは構いませんが、責任はあなたにあります。

1. フォント（と小さな `@font-face` スタイルシート）を [`publicDir`](/ja/docs/reference/config/) に置きます — `content/public/` は**出力ルート**にコピーされるので、`content/public/fonts/…` は `/fonts/…` で、`content/public/fonts.css` は `/fonts.css` で配信されます。

   ```css
   /* content/public/fonts.css → served at /fonts.css */
   @font-face {
     font-family: 'My Font';
     src: url('/fonts/my-font.woff2') format('woff2');
     font-weight: 100 900; /* variable weight axis */
     font-display: swap;   /* FOUT 制御 — フォールバックを即時表示し、準備でき次第差し替え */
   }
   ```

2. `site.font` をそれに向けます:

   ```ts
   site: {
     font: {
       body: "'My Font', ui-sans-serif, system-ui, sans-serif",
       mono: "'My Mono', ui-monospace, monospace", // 任意 — 省略するとシステム等幅のまま
       source: '/fonts.css',                       // あなたの @font-face スタイルシート（配列も可）
       label: 'My Font',                           // 任意 — ピッカーのラベル（デフォルトは "Custom"）
     },
   },
   ```

Ovellum はあなたのフォントをデフォルトにし（`<html data-font="custom">`）、`source` を `<head>` にリンクし、`--font-body`（`mono` を指定すれば `--font-mono` も）をマップします。外観の **Font** ピッカーにはそのフォント自身でプレビューしたカスタム項目が加わるので、読者はバンドルフォントへ切り替えてまた戻せます。FOUT / オプトアウトの挙動は*あなたの* `@font-face` の `font-display` 記述子が握ります。`swap` はフォールバックを即時描画してから差し替え、`optional` は低速回線での遅い差し替えを避けます。取得をウォームアップしたい場合は、`site.headExtra` 経由で `<link rel="preload" as="font" …>` を加えてください。

**より低レベルな代替手段。** ピッカーに触れたくない場合は、`headExtra` のスタイルシートから `--font-sans` / `--font-mono` トークンを直接上書きすることも引き続きできます — `site.font` オブジェクトは、それに加えてピッカーも配線してくれる人間工学的な道です。

### 読みやすいテキストサイズ

外観コントロールには、5 段階の**テキストサイズ**スケールも備わっています（2 段階小さく、真ん中がデフォルト、2 段階大きい）。段階的な「A」のランプとしてレンダリングされ、Kindle や Safari リーダーのサイズステッパーのようです。これは `--ov-text-scale` を介してモジュラー型スケール全体（本文とすべての見出し）を比例的にスケールし、`<html data-text-size>` に書き込まれ、訪問者ごとに記憶されます。

## 外観コントロール

トップバー右端のパレットアイコンは、5 つのコントロールを備えた小さなパネルを開きます（モバイルではメニューシートにインライン展開されます）。

- **モード** — `auto`（`prefers-color-scheme` で OS に追従）、`light`、または `dark`。`<html data-theme>` に書き込まれます。
- **テーマ** — バンドルされた 5 つのパレットのいずれか（それぞれ独自のライングリフを持つ）。`<html data-palette>` に書き込まれます。
- **カラー** — **CTA ボタン**のほか、リンク、フォーカスリング、「このページの内容」インジケーターを駆動するプライマリカラー。ホバー状態はそこから自動的にミックスされます。6 つのプリセット、ネイティブのカスタムカラーピッカー、そして先頭の**デフォルト**スウォッチ（テーマ自身のプライマリ — Ovellum ではダークチャコール — に戻します）があります。
- **テキストサイズ** — 読みやすさの型をスケールする 5 段階の「A」ランプ。`<html data-text-size>` に書き込まれます。
- **フォント** — Sans-Serif（デフォルト）/ Serif / Inter / Geist。`<html data-font>` に書き込まれます。Inter と Geist はオンデマンドで読み込まれます（上記の[フォント](#フォント)を参照）。

すべての選択は `localStorage` に保存され、描画前に適用されるので、再訪問時に間違った色がちらつくことはなく、訪問者の選択はページやセッションをまたいで追従します。

初回訪問時のデフォルトは config で設定します。

```json
{
  "site": {
    "defaultTheme": "dark",
    "palette": "nord",
    "accent": "oklch(57% 0.16 255)"
  }
}
```

`accent` は任意の CSS の色の値を取り、訪問者が自分の色を選ぶまでプライマリ + アクセントのロールを駆動します。未設定の場合、各テーマは自身のプライマリを使います（Ovellum のものはモノクロのチャコールです）。

## トップバー

デフォルトのトップバーは 3 カラムのグリッドです。左にブランド、右寄せのナビ、そしてコントロールのクラスター（検索スロット + 外観コントロール + モバイルメニューボタン）。

ブランドはデフォルトでは**サイトタイトル**です。[`site.logo`](/ja/docs/reference/config/)（単色の SVG/PNG へのパス — テーマに応じて反転するモノクロのシルエットとしてレンダリングされます）で、その前にオプションのマークを追加できます。未設定のままにすればタイトルが単独で表示されます。ファビコンはデフォルトでルートの `/favicon.ico` で、`site.favicon` で上書きできます。

`site.topbarNav` でナビ項目を追加します。

```json
{
  "site": {
    "topbarNav": [
      { "label": "Guides", "href": "/guides/manual-mode/" },
      { "label": "Reference", "href": "/reference/config/" },
      { "label": "GitHub", "href": "https://github.com/you/repo", "external": true }
    ]
  }
}
```

外部リンク（`external: true` または任意の `http(s)://` URL）は、`rel="noopener"` と小さな外部リンクアイコンとともに新しいタブで開きます。720px 未満ではナビがハンバーガーに折りたたまれ、トップバーの下にアンカーされた全幅のシートを開きます — 追加の設定は不要です。

## ヒーロー

ランディングページのヒーロー（`site.landing.enabled` が `true` のとき）は中央寄せで、擬似要素を介して適用される 2 つの重なった背景レイヤーを持ちます。これにより画像はサイトに同梱されません。

- 24px のドット状 SVG パターン（テーマに応じた塗り、端でフェードするようにマスクされる）。
- アクセントカラーの放射状スポットライトグラデーション（低い不透明度）。

ヒーローのタイポグラフィは `clamp()` を使い、メディアクエリの森なしにモバイルからデスクトップまでスケールします。タイトルの最大幅は 16ch、サブタイトルは 56ch です。

## アイコン

テンプレートは全体を通じて [Lucide](https://lucide.dev/) のアイコンを使っています。各アイコンは `stroke="currentColor"` と `stroke-width="2"` を持つインライン SVG なので、すべてのテーマで周囲のテキストから色を自動的に拾います。アイコンフォントも、別のリクエストもありません。

現在のバンドルで利用可能なアイコン:
`menu`、`close`、`sun`、`moon`、`monitor`、`chevron-down`、`github`、`external-link`、`search`、`check`。

新しいものを追加するには、`packages/site/src/icons.ts` に 1 つの import を追加し、`REGISTRY` マップに 1 つのエントリを追加するだけです。パッケージは Lucide の残りをツリーシェイクするので、各アイコンがバンドルに追加するのはおよそ 100 バイトです。

> Lucide v1 はブランドマークを削除した（商標の懸念）ため、`github` は Lucide のストローク言語に合わせて手作りした例外です。もっと多くのブランドロゴが必要なら、[simple-icons](https://simpleicons.org/) が標準的な相棒です。

## デフォルトテーマのカスタマイズ

正式なオーバーライドのフックは [`site.css`](/docs/reference/config/) です — 1 つ以上のスタイルシート URL を、Ovellum が自身のテーマ CSS の**後に** `<head>` へリンクするので、ソース順のカスケードであなたのルールが優先されます。あらゆるサーフェス、テキスト、ロールは[トークン](#トークンモデル)なので、いくつかのカスタムプロパティを再宣言したオーバーライドファイルがサイト全体を再スキンします — フォークも、ページごとの配線も不要です。

1. CSS ファイルを [`publicDir`](/docs/reference/config/) に置きます（出力ルートにコピーされます）: `content/public/theme.css` は `/theme.css` で配信されます。
2. `site.css` をそれに向けます:

   ```ts
   site: {
     css: '/theme.css',          // 単一の URL、またはその配列
   }
   ```

これで**ロール**をスキンし直せます — リンクとアクセントがどこでもそれに従います（これはグレー以外の色なので light と dark で異なります）。

```css
/* content/public/theme.css → /theme.css で配信 */
:root {
  --color-accent: oklch(55% 0.20 320); /* magenta */
  --color-accent-fg: var(--color-white);
  --color-accent-hover: oklch(48% 0.22 320);
}

:root[data-theme='dark'] {
  --color-accent: oklch(72% 0.18 320);
  --color-accent-fg: var(--color-gray-950);
  --color-accent-hover: oklch(80% 0.16 320);
}
```

あるいは、**グレーランプ**を上書きして UI 全体のトーンを変える — すべてのサーフェス、テキスト、（グレーの）ロールが一度にシフトし、コンポーネントごとの編集は不要です。

```css
:root {
  /* e.g. a warmer 'stone'-style neutral */
  --color-gray-100: oklch(97% 0.004 60);
  --color-gray-900: oklch(20.5% 0.006 60);
  /* …override whichever steps you use */
}
```

`site.css` は配列も、ローカルパスに加えて `http(s)://` の URL も受け付けます — なので、CDN 上の共有デザインシステムのスタイルシートを、サイト固有の小さなオーバーライドの前に重ねられます。

```ts
site: {
  css: ['https://cdn.acme.com/brand/tokens.css', '/theme.css'],
}
```

これは `<link rel="stylesheet">` タグのみを出力し、`javascript:` / `data:` の URL を拒否します — 任意の `<head>` マークアップ（`<style>` ブロック、preload ヒント、分析）には [`site.headExtra`](/docs/reference/config/) を使ってください。これはあなたの `css` の*後に*注入されるので、必要なら上書きもできます。

### ホストプロジェクトのデザインを継承する

Ovellum のドキュメントを、より大きなプロダクト — たとえば `/docs` のために `ovellum build` を実行し、すでに独自の色・light/dark・タイポグラフィを持つホストアプリ — に組み込む場合、`site.css` を使えばドキュメントは独自のパレットを持つ代わりに**ホストのデザインを採用**できます。その契約が**トークン層**です。これらのプロパティを再宣言すれば、テンプレートがそれに従います。

| トークングループ | オーバーライドするもの                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| サーフェス       | `--color-bg`、`--color-surface`、`--color-bg-subtle`、`--color-bg-muted`                          |
| テキスト         | `--color-fg`、`--color-fg-muted`、`--color-fg-subtle`                                            |
| 罫線             | `--color-border`、`--color-border-strong`                                                        |
| ブランドロール   | `--color-primary`（+ `-fg`/`-hover`）、`--color-accent`（+ `-fg`/`-hover`）                       |
| コールアウト     | `--callout-note-bg`/`-fg`、および `tip` / `important` / `warning` / `caution` のペア             |
| タイポグラフィ   | `--font-body`、`--font-mono`（およびそれらが既定で参照する `--font-sans` / `--font-serif` スタック） |

それぞれをホスト自身の変数（または値）にマッピングし、ダークの変種を `:root[data-theme='dark']` の下で指定します。

```css
/* host-bridge.css — ドキュメントにホストのデザインシステムのトークンを読ませる */
:root {
  --color-bg: var(--app-bg, #fff);
  --color-surface: var(--app-surface, #fff);
  --color-fg: var(--app-text, #1a1a1a);
  --color-fg-muted: var(--app-text-muted, #555);
  --color-border: var(--app-border, oklch(0% 0 0 / 0.1));
  --color-primary: var(--app-brand);
  --color-accent: var(--app-brand);
  --font-body: var(--app-font-sans);
  --font-mono: var(--app-font-mono);
}

:root[data-theme='dark'] {
  --color-bg: var(--app-bg-dark, #101010);
  --color-surface: var(--app-surface-dark, #181818);
  --color-fg: var(--app-text-dark, #f4f4f4);
  /* …各トークンのダーク側 */
}
```

ホストのデザイン変数（上記の `--app-*`）は、生成されたページ上で**スコープに入っている**必要があります — Ovellum は独立した HTML をビルドするので、それらを定義するスタイルシート（共有の `tokens.css`、ホストアプリが読み込むのと同じもの）を、ブリッジファイルの前に `site.css` から参照してください。

#### ホストのモード切り替えに追従する

`site.css` は*色*を継承させますが、ライト／ダークは橋渡しするまで**2 つのスイッチ**のままです。デフォルトでは Ovellum が自身の外観コントロール（`localStorage` に永続化）でモードを所有し、ホストの切り替え方とは独立しています。**[`site.appearance`](/docs/reference/config/)** がそのギャップを埋めます。

```ts
site: {
  // Ovellum 自身のライト／ダークトグルを外し、代わりにホストに追従する。
  appearance: 'inherit',
}
```

`appearance: 'inherit'` にすると、Ovellum は:

- 外観パネルから**モード（auto/light/dark）コントロールを削除**します — モードはホストが所有します（テーマ・カラー・テキストサイズ・フォントは引き続き読者が操作できます）。
- **自身のモードを永続化しなくなる**ので、古い Ovellum の選択が上書きすることはありません。
- **ライト／ダークを `prefers-color-scheme` から解決**します — これはホストの*自動*ライト／ダークがすでに追従しているものそのものなので、OS 駆動のホストはこれ以上何も要りません。

ホストのトグルが**手動**の選択（`.dark` クラス、next-themes、Tailwind の `class` 戦略）で、**同一オリジンの `localStorage`** に永続化されている場合は、Ovellum にそのキーを指定します — 読み込み時に読み取り、別のタブでホストが切り替えるとライブ更新します。

```ts
site: {
  appearance: {
    mode: 'inherit',
    storageKey: 'theme',   // ホストアプリ自身の localStorage キー
    darkValue: 'dark',     // ダークを意味する値（デフォルト 'dark'）
    lightValue: 'light',   // ライトを意味する値（デフォルト 'light'）
  },
}
```

Ovellum は `darkValue`→ダーク、`lightValue`→ライトにマッピングし、それ以外（`'system'` の値、未設定、不明）は `prefers-color-scheme` にフォールバックします。ドキュメントとホストアプリはオリジンを共有しているので、ホストが他の場所でテーマを切り替えるとドキュメントのページで `storage` イベントが発火し、両者が歩調を合わせます。（これには同一オリジンのホスティングと、ホストが自身の選択を `localStorage` に書き込むことが必要です。永続化される信号なしにクラスを切り替えるだけのホストの場合は、`'inherit'` + `prefers-color-scheme` のままにするか、クラスをキーにミラーしてください。）

> ブリッジスタイルシートでは `:root` と `:root[data-theme='dark']` の両方を引き続きオーバーライドしてください — `appearance: 'inherit'` は*どの*モードがアクティブかを決め、`site.css` は各モードがどう見えるかを決めます。

#### bare モード

「ホストが色をすべて所有する」最もクリーンな方法として、上記のブリッジスタイルシートは Ovellum のトークンをホストの変数に手作業でマッピングします。**`palette: 'bare'`** はその配線を肩代わりします。**ベイクされたパレットを一切含まず**、代わりに小さく固定された **`--ov-host-*`** 変数のセットを公開します — それらを（`site.css` で）定義すれば色を所有でき、何も定義しなければ Ovellum のデフォルトの見た目がそのまま残ります。

```ts
site: {
  palette: 'bare',         // ベイクされたパレットなし — 色を --ov-host-* に委ねる
  css: '/host-theme.css',
  appearance: 'inherit',   // ライト／ダークもホストに委ねる
}
```

```css
/* host-theme.css — bare なドキュメントが使う唯一の色 */
:root {
  --ov-host-bg: #fafafa;
  --ov-host-surface: #fff;
  --ov-host-fg: #1a1a1a;
  --ov-host-fg-muted: #585858;
  --ov-host-border: oklch(0% 0 0 / 0.1);
  --ov-host-primary: #2563eb;       /* CTA ボタン。primary-hover は派生 */
  --ov-host-accent: #2563eb;        /* リンク + フォーカスリング */
  --ov-host-font-body: 'Inter', system-ui, sans-serif;
}
:root[data-theme='dark'] {
  --ov-host-bg: #0c0c0c;
  --ov-host-surface: #161616;
  --ov-host-fg: #f4f4f4;
  /* …各トークンのダーク側 */
}
```

全セット: `--ov-host-bg`、`--ov-host-surface`、`--ov-host-fg`、`--ov-host-fg-muted`、`--ov-host-border`、`--ov-host-border-strong`、`--ov-host-primary`（+ `-fg`、`-hover`）、`--ov-host-accent`（+ `-fg`、`-hover`）、そして `--ov-host-font-body`。未定義のものはそのモードの Ovellum デフォルトにフォールバックし、派生トークン（リンク、コールアウト、罫線のヘアライン、インラインコードのチップ）は `--color-fg`／`--color-accent` に自動的に従うので、上記のひと握り以上を設定することはめったにありません。テーマピッカーは削除されます（ベイクされたパレットへの切り替えはあなたの色と衝突するため）。カラー・テキストサイズ・フォントは残ります。

**bare と手書きブリッジの比較:** どちらも同じ結果に行き着きます。公開された名前付きの契約（`--ov-host-*`）が欲しく、ピッカーを自動で外したいときは `palette: 'bare'` を使い、いくつかのトークンを微調整するだけでベイクされたパレットをフォールバックとして残したいときは[トークン表](#ホストプロジェクトのデザインを継承する)から直接ブリッジを書いてください。

## ランディングページのテーマ設定

`site.landing` を有効にしている場合、ランディングは同じトークンを継承します。ヒーロー、フィーチャーカード、トラストストリップは、ほかのすべてのコンポーネントと同様に `--color-fg`、`--color-bg`、`--color-accent`、`--color-border` を読みます。ヒーローのスポットライトの色味は `--color-accent` に自動的に従うので、アクセントを変えればヒーローの雰囲気も自動的にスキンし直されます。

## コードブロックのテーマ

コードブロックはビルド時に [shiki](https://shiki.style/) でレンダリングされます。各テーマは CSS 変数を通じて出力される `{ light, dark }` のペアです — 同じ HTML が両方のカラースキームを提供し、`<html>` の `[data-theme]` を切り替えるとランタイムコストゼロでパレットが入れ替わります。

`site.codeTheme` で 1 つ選びます。

```json
{
  "site": {
    "codeTheme": "nord"
  }
}
```

| 値            | Light          | Dark              | 備考                               |
| ------------- | -------------- | ----------------- | ---------------------------------- |
| `'github'`    | github-light   | github-dark       | デフォルト。Ovellum のデフォルトに合います。 |
| `'nord'`      | min-light      | nord              | Nord は shiki では dark のみ。クリーンで低彩度の light のために min-light とペアにしています。 |
| `'solarized'` | solarized-light| solarized-dark    | Ethan Schoonover の solarized。     |

## 今日バンドルされているもの vs. 計画中のもの

**現在利用可能:**

- [`site.css`](#デフォルトテーマのカスタマイズ) によるサイト全体の CSS オーバーライド + テーマ継承。
- [`site.appearance: 'inherit'`](#ホストのモード切り替えに追従する) によるホストプロジェクトのライト／ダークへの追従。
- デフォルトの light + デフォルトの dark。
- `prefers-color-scheme` による OS への自動追従。
- 描画前のテーマスクリプト（ちらつきなし）。
- `renderIcon(name)` ヘルパーを備えた Lucide ベースのアイコンレジストリ。
- モバイルシート付きの右寄せトップバーナビ（720px 未満でハンバーガー）。
- ドットノイズ + アクセントスポットライトの背景を持つ中央寄せのヒーロー。
- ネストされたページで記事の上に表示されるパンくずリスト。
- 記事の上に表示されるページごとのメタ行（読了時間 + 最終更新日）。
- クロームを取り除き記事を広げるプリント用スタイルシート。
- カスタム 404 レイアウト（狭いカラム、大きな見出し、クロームなし）。
- すべてのコードブロックのコピーボタン。

**ロードマップ:**

- **ページ**テーマを名前で切り替える `site.theme` config（Nord、Dracula など）。各テーマは[トークンモデル](#トークンモデル)に従い、独自のグレーランプ + ロール値に加え、反転ランプの dark ブロックを同梱します。今日はデフォルトのページテーマのみが同梱されています。`site.codeTheme` はすでにシンタックスパレットを切り替えます。
- ドキュメントを**ホストプロジェクトの** light/dark スイッチ（`prefers-color-scheme` またはホストの属性）に追従させる `appearance: 'inherit'` モード — [テーマ継承](#ホストプロジェクトのデザインを継承する)の欠けているもう半分。
- 完全にカスタムなテンプレートのためのプラグイン API。
- 一度きりのページ固有 CSS のためのページごとの `extraStyles`。

CSS レベルのカスタマイズ — 色、フォント、トークンのオーバーライド、UI 全体の再スキン、ホストのデザインシステムの継承 — は、今日 [`site.css`](#デフォルトテーマのカスタマイズ) で扱えます。上記のロードマップ項目は CSS を*超えて*テンプレートの**構造**を変えることに関するものです。それらが実現するまでは、その種のより深いカスタマイズは [`templates/default/`](https://github.com/oinam/ovellum/tree/main/packages/site/src/templates/default) ディレクトリをフォークし、独自の `ovellum.config.ts` をそのフォークに向ける（Ovellum がテンプレートを更新したらリベースし直す）ことを意味します。これは v1 のための意図的な制約です — カスタマイズの表面が安定すれば、API はよりコミットしやすくなります。
