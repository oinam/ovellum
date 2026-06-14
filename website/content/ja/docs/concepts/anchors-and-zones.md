---
title: アンカーと保護ゾーン
description: 自動生成されたコンテンツと手書きのコンテンツを共存させるタグ付けの取り決め。
---

# アンカーと保護ゾーン

ハイブリッドモード（および将来の `@preserve` に対応した自動モード）が機能するのは、
Ovellum と書き手が2種類のマーカーについて合意しているからです。この2つが合わさって
一つの取り決めを形づくります。保護ゾーンの内側にあるものは書き手のもの、それ以外の
すべてはツールのものです。

## アンカー

Markdown ファイル内のすべての自動生成セクションには、それがどのソースシンボルを
ドキュメント化しているかを示す HTML コメントが付きます:

```html
<!-- ovellum:anchor id="src/utils/format.ts::formatDate" generated="2026-05-16T..." -->
```

`id` はシンボルの **アンカー ID** で、`{relativeFilePath}::{symbolPath}` の形式で
表されます。クラスメソッドはドット記法を使います
（`src/models/User.ts::User.constructor`）。モジュールレベルのドキュメントは
番兵値 `__module__` を使います。

アンカーは読者には見えません。HTML コメントであり、ブラウザによって取り除かれます。
その役割は、マージエンジンに各セクションへの安定したハンドルを与えることです。

## 保護ゾーン

保護ゾーンは、Ovellum が決して上書きしない Markdown の領域です。あなたが書き、
あなたが永続的に所有します。

```markdown
<!-- @manual:start id="rationale" -->

**Note.** We use `String#padStart` here instead of a manual loop because V8
intrinsifies it and the manual version showed up in flamegraphs. This
commentary was added by hand and should survive regeneration.

<!-- @manual:end -->
```

ルール:

- `id` 属性は任意ですが、強く推奨します。これがないと Ovellum は `manual-block-3`
  のような位置ベースのフォールバックを生成しますが、周囲のファイルが再構成されると
  これは壊れます。
- 明示的な `id` があれば、ブロックはアンカーが消えること以外のどんな変化も生き延びます。
- ブロックはどこにでも置けます。見出しと本文のあいだ、コードフェンスの後、リストの中、
  どこでもかまいません。
- ネストしたゾーンはサポートされていません。ネストすると明確なエラーが出ます。

## どう組み合わさるか

各保護ゾーンは、直前にある最も近いアンカーコメントと自動的に関連付けられます。
そのアンカーこそが、次回のビルドでマージエンジンがブロックの置き場所を見つけるために
使うものです:

```
<!-- ovellum:anchor id="src/utils/format.ts::formatDate" generated="..." -->
## formatDate

Auto-generated description.

| Param  | Type   |
| ------ | ------ |
| ...    | ...    |

<!-- @manual:start id="rationale" -->
Hand-written note.
<!-- @manual:end -->
```

次回のビルドでは、自動生成されたテーブルの形が変わっても、保護ゾーンは
`formatDate` の下にとどまります。Ovellum はアンカー ID を見て、ブロックを探し出し、
同じ位置に差し戻します。

## アンカーが消えたとき

ソースで `formatDate` をリネームまたは削除すると、そのアンカー ID
（`src/utils/format.ts::formatDate`）は新しく生成されたコンテンツに現れなくなります。
マージエンジンは保護ブロックの置き場所を見つけられません。そのブロックは
[孤立ブロック](/ja/docs/concepts/orphans/)となり、あなたが確認できるよう
`.ovellum/orphans/` に隔離されます。決して黙って捨てられることはありません。

## インラインのいとこ: `@preserve`

ブロックタグは Markdown ファイルの中で機能します。ソースコード向けには、その JSDoc
版があります:

```typescript
/**
 * Formats a date.
 *
 * @preserve
 * **Note:** uses the user's local timezone by default. Override with the
 * `timezone` option for deterministic output.
 *
 * @param date - The date to format.
 */
export function formatDate(date: Date): string {
  /* ... */
}
```

ソースコメントに `@preserve` が現れると、Ovellum は（いずれ — これはロードマップ上に
あります）生成された Markdown の中でその説明を保護ゾーンで自動的に囲み、手書きのメモが
手動で書いたゾーンと同じように生き延びるようにします。

IR は現在このフラグ（`DocNode.isPreserved`）を捕捉しています。ジェネレーターでの
自動ラップは
[コード側の TODO](https://github.com/oinam/ovellum/blob/main/docs/internal/TODO.md)
で追跡されています。

## タグの設定

どちらのタグも設定可能です。`@manual` や `@preserve` がプロジェクト内の何かと
衝突する場合のためです:

```json
{
  "protect": {
    "blockTag": "@keep",
    "inlineTag": "@hand-written"
  }
}
```

カスタマイズは控えめにしてください。デフォルトはあらゆる場所でドキュメント化されており、
これらを変更すると、将来の Ovellum の更新がデフォルトのタグ名に紐づいた新しい振る舞いを
もたらす可能性があります。
