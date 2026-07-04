---
title: アセットとダウンロード
description: 画像、動画、音声、PDF、その他のファイルをどこに置き、どう参照・埋め込み・リンクするか。
tags: [assets, images, video, audio, downloads]
sourceHash: '3323bb063357702b'
---

# アセットとダウンロード

画像、動画、音声、PDF、フォント、zip — Markdown ページ以外のあらゆるもの。それらを
置く場所は**2 つ**あり、ファイルが 1 つのページに属するのか、それともサイト全体で
安定した URL に存在すべきなのかによって決まります。

## 1. コンテンツのそばに

コンテンツフォルダ内の**どこにあっても**、Markdown 以外のファイルはパスを保ったまま
出力にそのままコピーされます。これは、特定のページやセクションに紐付くアセットの
自然な置き場所です:

```
content/
  guides/
    install.md
    architecture.svg     →  /guides/architecture.svg
    setup.zip            →  /guides/setup.zip
```

**ルート絶対パス**（先頭の `/`）で参照します:

```markdown
![Architecture](/guides/architecture.svg)
[Download the starter kit (4 MB)](/guides/setup.zip)
```

> **相対パスではなく、ルート絶対パスを使ってください。** ページはきれいな URL
> （`guides/install.md` → `/guides/install/`）になるので、*相対*の `architecture.svg`
> は、ファイルがあるフォルダではなく `/guides/install/` に対して解決されてしまいます。
> `/guides/architecture.svg` は常に意図したところを指します。

## 2. `public/` フォルダ → サイトルート

予約された [`publicDir`](/ja/docs/reference/config/)（デフォルトは `public/`）は、
**サイトのルート**にコピーされます — Next.js、Astro、Vite、Hugo（`static/`）と同じ
慣習です。ルートに存在しなければならないファイルや、きれいで永続的な URL に置きたい
共有ダウンロードに使います:

```
content/
  public/
    favicon.ico          →  /favicon.ico
    robots.txt           →  /robots.txt
    report.pdf           →  /report.pdf
    media/intro.mp4      →  /media/intro.mp4
    downloads/app.zip    →  /downloads/app.zip
```

`public/` の中身は一切処理されません — `.md` でさえそのままコピーされ、ページに
変換されることはありません。お好みで `site.publicDir` を使って名前を変更できます。

**目安:** ページ固有の画像 → ページのそばに置く。きれいで永続的な URL がほしい
ダウンロードや共有アセット（あるいは `favicon.ico` / `robots.txt` のようにルートが
必須のファイル）→ `public/`。

## `public/` を CDN から提供する

デフォルトでは `public/` はサイト*とともに*出荷されます。代わりに CDN やオブジェクト
ストアから提供するには、[`site.assetBaseUrl`](/ja/docs/reference/config/) を設定します —
Vite の `base` や Next の `assetPrefix` と同じ発想です:

```ts
export default {
  site: {
    assetBaseUrl: 'https://cdn.example.com/site',
  },
} satisfies OvellumUserConfig;
```

あなたは**同じルート絶対パス**（`/report.pdf`、`/media/intro.mp4`）で書き続けます。
ビルド時に Ovellum は:

- **`public/` のローカルへのコピーを止め** — その中身は自分で CDN にアップロードし
  （一度きり、またはデプロイ手順で）、そして
- レンダリングされた HTML 内の **`public/` のファイルへのすべての参照を CDN に
  書き換えます**。そのため `/report.pdf` は `https://cdn.example.com/site/report.pdf`
  になります。

*コンテンツのそばに*存在するアセット（セクション 1）は HTML サイトの一部であり、
**手を加えられません** — CDN に移るのは `public/` だけです。すでにクエリ文字列を
持つ URL や `srcset` 内にある URL は書き換えられません。それらのファイルは、最終的な
CDN の URL で直接参照してください。

## ファイル種別ごと

### 画像

```markdown
![A diagram of the build pipeline](/guides/pipeline.svg)
```

#### 画像の最適化

デフォルトでは画像は**そのまま**コピーされます。ビルド時にラスター画像
（`.jpg` / `.jpeg` / `.png` / `.webp` / `.avif`）を再圧縮するには、
[`site.images`](/ja/docs/reference/config/) を設定します。

```ts
site: {
  images: { quality: 80 }, // quality は任意（デフォルト 80）
}
```

各画像は**その場で**再エンコードされます — 同じパス・同じ形式で、バイト数だけ小さく —
なので `![…](/img/hero.png)` の参照は変わりません。非可逆形式は `quality` を使い、PNG は
可逆で再圧縮されます。再エンコードのほうが*大きく*なる場合（すでに最適化済みの画像）は
元のファイルを保持するので、最適化でファイルが大きくなることはありません。SVG と GIF は
そのまま通過します。ビルドは最適化した画像の数と削減バイト数を報告します。

> 最適化には [**sharp**](https://sharp.pixelplumbing.com) を使います。これは
> `site.images` を設定したときだけ読み込まれる**オプションの**依存関係です — Ovellum と
> 一緒にインストールしてください: `npm i sharp`。（画像を最適化しないドキュメントサイトを
> 軽量に保つため、デフォルトのインストールには含まれません。）

##### WebP / AVIF への変換

再圧縮よりさらに踏み込むには、`format` を設定してラスター画像を
[WebP](https://developer.mozilla.org/docs/Web/Media/Formats/Image_types#webp)
（PNG/JPEG よりはるかに小さく、ブラウザ対応は約 97%）または
[AVIF](https://developer.mozilla.org/docs/Web/Media/Formats/Image_types#avif)
（さらに小さく、対応は約 95%）に変換します:

```ts
site: {
  images: { format: 'webp' }, // または 'avif'
}
```

`.png` / `.jpg` / `.jpeg` アセットは隣に `.webp` / `.avif` として書き出され、Ovellum は
Markdown の対応する `<img src>` 参照を新しいファイルへ指すように書き換えます — そのため
`![](/img/hero.png)` は手を加えずに `/img/hero.webp` を指します。それ以外の形式
（`.webp`、`.avif`、`.svg`、`.gif`）や、外部 / `data:` の画像 URL はそのままです。

> **注意:** `format` は画像の*パス*を書き換えるため、[`site.assetBaseUrl`](/ja/docs/reference/config/)
> とは併用できません（CDN は元画像を配信するため）。書き換えるのは **Markdown** 本文中の
> 参照だけです — ランディングのヒーローや生 HTML の `<img>` で画像を指す場合は、最終的な
> `.webp` / `.avif` パスを自分で指定してください。

##### 画像幅の上限

Retina ディスプレイのスクリーンショットは日常的に 3000px 以上あります — どんな
ドキュメントレイアウトの表示幅よりもはるかに大きい値です。`maxWidth` は上限を超える
ラスターを縮小します（アスペクト比は維持。小さい画像はそのままで、拡大されることは
ありません）:

```ts
site: {
  images: { maxWidth: 1600, quality: 80, format: 'webp' }, // それぞれ任意
}
```

再圧縮や `format` と組み合わせられます — 先にリサイズし、それからエンコードします。

#### CSS と JS の縮小

自分の `.css` / `.js` を出荷する場合 — コンテンツフォルダ内のファイルや、カスタムな
[`templateDir`](/ja/docs/guides/themes/#テンプレートディレクトリを持ち込む)の
`style.css` / `script.js` — ビルド時にそれらを縮小するには
[`site.minify`](/ja/docs/reference/config/) を設定します:

```ts
site: {
  minify: true,
}
```

**あなたの**アセットだけが対象です: バンドルのデフォルトテーマはすでに縮小済みで出荷され、
HTML ページは縮小されません。縮小後が元より大きくなる場合は破棄され（元を保持）、縮小に
失敗したファイルは警告とともにそのままコピーされます。ビルドは縮小したアセットの数と
削減バイト数を報告します。

> 縮小には [**esbuild**](https://esbuild.github.io) を使います。これは `site.minify` が
> `true` のときだけ読み込まれる**オプションの**依存関係です — `npm i esbuild` で
> インストールしてください。画像最適化と同様、必要としないドキュメントサイトを軽量に
> 保つため、デフォルトのインストールには含まれません。

### PDF、zip、その他のダウンロード

ただのリンクです — ブラウザがそれを開くかダウンロードします:

```markdown
[Read the spec (PDF, 1.2 MB)](/report.pdf)
[Download v1.0 (zip)](/downloads/app-1.0.zip)
```

### 動画と音声

Markdown 内の生の HTML でネイティブのプレーヤーを埋め込みます（サニタイザーを
通過できます）:

```html
<video src="/media/demo.mp4" controls width="720" poster="/media/cover.jpg"></video>

<audio controls>
  <source src="/media/talk.mp3" type="audio/mpeg" />
</audio>
```

許可される属性は表示/再生に関するものだけです — `controls`、`width`、`height`、
`poster`、`preload`、`loop`、`muted`、`autoplay`、`playsinline`、加えて
`<source>` / `<track>`。`src` / `poster` の URL はスキームがチェックされ
（`http(s)` または相対）、イベントハンドラ（`onerror`、…）は除去されるので、埋め込みが
スクリプトを運ぶことはできません。小さく、Web 向けに最適化された `.mp4` / `.webm` /
`.mp3` を選んでください。

### YouTube と Vimeo

YouTube または Vimeo で動画を開き、**共有 → 埋め込み**を押して、出てきた `<iframe>` を
**そのまま**貼り付けてください — 編集は不要です:

```html
<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="YouTube video player"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>
```

Ovellum は**既知の動画ホストからのみ** `<iframe>` を許可します（`youtube.com`、
`youtube-nocookie.com`、`vimeo.com`）。そのため、それ以外のどこか（あるいは相対パス）を
指す iframe はサニタイズ中に除去されます — 信頼できないページを誤って埋め込むことは
できません。生き残ったものは自動的に強化され（`loading="lazy"`、厳格なリファラ
ポリシー）、レスポンシブな 16:9 のフレームで包まれるので、貼り付けたスニペット内の
固定の `width` / `height` は問題になりません。YouTube のプライバシー保護型の埋め込みが
ほしい場合は `youtube-nocookie.com` を選んでください。ライブな例については
[スタイルガイド](/ja/docs/reference/styleguide/#video)を参照してください。

## ソーシャル共有画像（OpenGraph）

ページがソーシャルプラットフォームやチャットアプリで共有されると、その OpenGraph
メタからプレビューカードが取得されます。Ovellum は**ページごとにカードを生成**できます —
[`site.ogImage`](/ja/docs/reference/config/) を設定します:

```ts
site: {
  baseUrl: 'https://docs.example.com', // 必須 — ソーシャルタグは絶対 URL です
  ogImage: true,
}
```

各ページに 1200×630 の画像（ページタイトル + サイト名をフラットな背景に）が
`og/<slug>.png` として書き出され、ページの `<head>` に `og:image`、`twitter:image`、
`og:title`、`og:url`、`twitter:card` のメタが追加されます。
[ランディングページ](/ja/docs/reference/config/#sitelanding)にもカードが付きます
（ヒーローのタイトルを使用）。ドラフトと 404 ページは
除外されます。色を調整するにはオブジェクトを渡します:

```ts
site: {
  ogImage: { background: '#101418', foreground: '#fafafa' },
}
```

`site.baseUrl` は**必須**です — 設定しないとビルドは警告し、何も生成しません（相対の
`og:image` はスクレイパーでは解決できません）。生成にはオプションの
[`sharp`](https://sharp.pixelplumbing.com) ピア依存（`npm i sharp`）を使い、`ogImage` を
設定したときだけ遅延読み込みされます。

> カードのテキストはビルドマシンのデフォルトの sans-serif フォントでレンダリングされます。

## リンクをチェックする

`ovellum check` は内部の**ページ**リンクを検証します。アセットの URL（画像、
ダウンロード）はページではなくファイルを指すので、そのパスが正しいかは自分で
保ってください — 手早いローカルの `ovellum serve`（または `ovellum dev`）が、画像が
表示されダウンロードが解決することを確認する最速の方法です。
