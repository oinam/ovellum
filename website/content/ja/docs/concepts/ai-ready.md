---
title: AI エージェントのための Ovellum
description: ドキュメントは最初から llms.txt 対応、エージェントは Ovellum をツールとして操作でき、そして — 他にはない点として — エージェントが生成ドキュメントを編集してもその文章が上書きされません。
sourceHash: '6658ff0daee0a70d'
---

# AI エージェントのための Ovellum

ドキュメントには今や 2 種類の読み手がいます。それを読む人々と、それを読み、ますます
_書く_ ようになっているエージェントです。Ovellum は 2 つめの読み手を、プラグインでは
なく第一級の関心事として扱います。3 つのことが、何もせずに手に入ります。

## 読み取り対応

ビルドのたびに、HTML の隣に機械可読なコンパニオンを出力します。
[llmstxt.org](https://llmstxt.org) の慣習に従っています:

- `/llms.txt` — 全ページのリンク優先のインデックス。
- `/llms-full.txt` — コーパス全体を 1 つの Markdown ストリームに。
- 各ページの `.md` ミラー — HTML の背後にある Markdown をそのまま。

エージェントは、レンダリング済みページをスクレイピングする代わりに、きれいな Markdown
としてドキュメントを読めます。デフォルトでオン。[`site.ai`](/ja/docs/reference/config/#ai)
を参照してください。

## エージェントから操作可能

エージェントは、人間向けの出力を解析せずに Ovellum を操作できます。`build`、`check`、
`diff` は安定した終了コードとともに [`--json`](/ja/docs/guides/automation/) を話し、
`ovellum mcp` は [Model Context Protocol](https://modelcontextprotocol.io)
サーバーを起動して操作をツールとして公開します。セットアップはコピー＆ペーストで済みます —
生成される `AGENTS.md` と [Claude Skill](/ja/docs/guides/automation/) が、使い方を
エージェントに伝えます。

## 安全に編集可能

これは、他のどんなドキュメントツールも提供しないものです。Ovellum の
[hybrid マージエンジン](/ja/docs/concepts/modes/)が手書きの文章を
[保護ゾーン](/ja/docs/concepts/anchors-and-zones/)の中に保つため、エージェントは
生成ドキュメントに本物の文章を寄与し、それを**次回の再生成でも生き延びさせる**ことが
できます — 人間が `@manual` マーカーの間を編集するのと、まったく同じ保証です。MCP
経由なら `ovellum_write_zone` ツールです。

そして、リファクタリングがその文章の足場を動かしても、文章は失われません。
[`ovellum diff`](/ja/docs/reference/cli/#ovellum-diff) がリネームの可能性を示し、
再配置できないものは黙って捨てられる代わりに、レビュー用に
[`.ovellum/orphans/`](/ja/docs/concepts/orphans/) へ隔離されます。

---

読み取り対応、操作可能、そして安全に編集可能 — 人間の文章と生成ドキュメントを正直に
保つのと同じアンチドリフトの契約を、エージェントにも広げたものです。まずは
[自動化と AI エージェント](/ja/docs/guides/automation/)ガイドから。
