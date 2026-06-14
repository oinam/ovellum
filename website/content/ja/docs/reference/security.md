---
title: セキュリティ
description: 脅威モデル、サニタイズ方針、そして Ovellum がデフォルトで適用する保護について。
---

# セキュリティ

Ovellum は Markdown を HTML に変換するビルド時ツールです。このページでは、
何を、どのように防御し、どこを明示的に防御しないのかを説明します。

## 脅威モデル

Ovellum でビルドされたサイトには、3 つの当事者が関わります。

| 当事者                  | 信頼度                              | 備考                                                                                              |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **作成者**             | 信頼できる                            | `ovellum.config.*` と `.md` コンテンツを書きます。ソースファイルは信頼しますが、タイポには備えます。 |
| **ビルド環境**  | 信頼できる                            | `ovellum build` は作成者の権限でローカルまたは CI 上で実行されます。                               |
| **サイトの閲覧者** | 信頼できない（サイトの観点から）    | レンダリングされた HTML をブラウザで閲覧します。攻撃者が制御するコンテンツを彼らに届けてはなりません。    |

注目すべき攻撃者は **サードパーティの貢献者** です。Ovellum でビルドされる
リポジトリに Markdown を追加する PR を提出できる人物のことです。そうした PR に
含まれる悪意ある `<script>` タグ、`onclick` ハンドラ、`javascript:` href が、
PR のマージ後に訪問者が読み込むレンダリング済み HTML に残ってはなりません。

ビルドホスト上ですでに任意のコードを実行できる作成者に対しては防御 **しません**。
`ovellum.config.ts` を制御できるなら、ビルドを制御できる――config の読み込み
パス全体は、そのファイルを Node スクリプトとして実行するのと同等の権限を持ちます。

## HTML サニタイズ

すべての Markdown ソースは、出力が生成される前に
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) を通過します。
パイプラインは次のとおりです。

```
remark-parse → remark-rehype (allowDangerousHtml)
             → rehype-raw            ← parses literal HTML strings into HAST
             → rehype-sanitize       ← strips dangerous elements/attrs
             → rehype-slug
             → rehype-autolink-headings
             → custom (collect headings + shiki highlight)
             → rehype-stringify
```

### 除去されるもの

- `<script>`、`<object>`、`<embed>`
- 動画埋め込みの許可リスト **以外** のホストからの `<iframe>`
  （後述の「保持されるもの」を参照）――および、相対パスや
  `http(s)` 以外の `src` を持つすべての iframe
- `on*` イベントハンドラ属性（`onclick`、`onload` など）
- `href`、`src`、`cite`、`longDesc` における許可リスト以外の URL スキーム。
  現在の許可リストは、`href` については `http`、`https`、`irc`、`ircs`、
  `mailto`、`xmpp`、`src` と `cite` については `http`、`https` です。

`data:` URL は、`<img src>` を含めどこでも **許可されません**。
`data:image/svg+xml` がブラウザに実行される `<svg onload="…">`
ペイロードを運び込める可能性があるためです。

### 保持されるもの

デフォルトのスキーマは、作成者が実際に使う HTML 要素を許可します。
`<details>`、`<summary>`、`<kbd>`、`<sup>`、`<sub>`、`<mark>`、`<abbr>`、
テーブルなどです。

Ovellum はネイティブのメディアプレーヤー――**`<video>`、`<audio>`、および
その `<source>`/`<track>` 子要素**――も許可するため、mp4/webm/mp3 を
インラインで埋め込めます（[アセットとダウンロード](/ja/docs/guides/assets/) を参照）。
保持されるのは表示/再生に関する属性のみです（`controls`、`width`、`height`、
`poster`、`preload`、`loop`、`muted`、`autoplay`、`playsinline`）。
`src`/`poster` は同じ `http(s)` 限定のスキームチェックを通過し、イベント
ハンドラは依然として除去される――そのため、メディア埋め込みがスクリプトを
運び込むことはできません。

**動画埋め込み** については `<iframe>` が許可されますが、二段階で絞り込まれます。
サニタイザーはまず固定の属性セット（`src`、`title`、`width`、`height`、
`loading`、`referrerpolicy`、`allow`、`allowfullscreen`）で iframe を保持し、
次に二度目のパスで **`src` のホストが既知のプレーヤーでない iframe を
すべて除去** します――現在は `youtube.com`、`youtube-nocookie.com`、
`vimeo.com`（それらの `www.`/`player.` サブドメインを含む）です。残った iframe は
自動的に堅牢化されます。`loading="lazy"`、
`referrerpolicy="strict-origin-when-cross-origin"`、そしてレスポンシブな
ラッパーが付与されます。相対パスや任意ホストの iframe は丸ごと破棄されるため、
埋め込みが攻撃者のページを指すことはできません。

### 順序が重要

サニタイズは shiki ハイライトの **前** に実行されます。shiki はサニタイザーが
本来なら除去してしまうインラインの `style="…"` 属性を出力します――shiki を
二番目に実行することで、その生成出力は無傷のまま保たれ、作成者が書いた
HTML はロックダウンされます。

## シェルインジェクション耐性

Ovellum が外部バイナリを呼び出すとき（現在は、各ページの最終更新タイムスタンプ
取得のための `git`）、引数は配列として `execFile` 経由で渡されます。コマンド
文字列を組み立ててシェルに渡すことは決してありません。

実際の帰結として、`$(...)`、バッククォート、`;cmd`、その他のシェル
メタ文字を含むパスは、`git` へのリテラルなファイル名引数として扱われ、
sh/zsh によって解釈されることはありません。`@ovellum/site` のテストは、
`inject;touch PWNED;x.md` や `$(touch PWNED).md` という名前のフィクスチャ
ファイルを書き出し、カナリアが決して出現しないことを表明することで、この
挙動を固定しています。

## `ovellum check` における URL スキーム許可リスト

レンダリング時の除去に加えて、`ovellum check` はスキームが拒否リスト
（`javascript:`、`vbscript:`、`data:`、`file:`）に含まれるリンクを
`[SECURITY]` の問題として報告し、作成者がソース内でそれに気づいて削除できる
ようにします。これは多層防御です。サニタイザーはレンダリング済み HTML を
いずれにせよ安全に保ちますが、lint 時に報告することで、それらが黙って除去された
まま出荷されることを防ぎます。

検出処理は、照合の前に HTML 数値実体参照（`&#x09;` → タブ）とゼロ幅 / BiDi /
空白文字を正規化するため、`javas&#x09;cript:` や `\tjavascript:` のような
試みも捕捉されます。

出力形式と終了コードについては
[CLI → `ovellum check`](/ja/docs/reference/cli/#ovellum-check) を参照してください。

## 現時点で対象外のもの

- **サプライチェーンのピン留め。** `package.json` はキャレット範囲（npm の
  デフォルト）を使っており、正確なバージョンには固定していません。開発ツール
  としては許容範囲ですが、Ovellum が広くインストールされるようになったら
  見直す価値があります。
- **`input/` 内のシンボリックリンクのトラバーサル。** 作成者のコンテンツ
  ディレクトリに `/etc/passwd` へのシンボリックリンクが含まれていると、
  Ovellum はその内容を読み込み、（ファイル拡張子によっては）レンダリング
  してしまう可能性があります。緩和策はコンテンツディレクトリを信頼すること
  であり、現時点ではこれを検出しようとはしません。
- **config ファイルによるプロトタイプ汚染。** `"__proto__": {…}` を含む
  悪意ある config は、理論上はプロトタイプを汚染し得ますが、strict モードの
  `Object.keys` ベースのマージは `Object.prototype` に書き込みません。
  キーを明示的にフィルタリングするのではなく、この挙動に依拠しています。
- **巨大な Markdown ファイルによるリソース枯渇。** `.md` 入力にサイズ制限は
  ありません。数 GB の Markdown ファイルはビルドを遅くしますが、出力を
  侵害することはありません。

## 報告

セキュリティ上の問題を見つけましたか？ 閲覧者のブラウザでコードを実行する
ために使われ得るものについては、メンテナーに直接メールしてください
（連絡先はプロジェクトの README にあります）。悪用不可能な懸念については、
公開の GitHub issue で構いません。
