import type { OvellumUserConfig } from 'ovellum';

// `import type` is erased at load time, so this config carries no runtime
// dependency on the `ovellum` package resolving from here — it just gives
// editors type-checking + autocomplete. `satisfies` keeps the literal types.
export default {
  name: 'Ovellum',
  version: '0.1.0',
  mode: 'manual',
  input: './content',
  output: './dist',
  defaultFormat: 'md',
  site: {
    title: 'Ovellum',
    logo: '/ovellum-logo.svg',
    favicon: '/ovellum-logo.svg',
    version: 'v0.23.0',
    description:
      'Ovellum is an open-source documentation tool for TypeScript and JavaScript. It lets auto-generated API docs and hand-written narrative live together in the same files, without conflict.',
    baseUrl: 'https://ovellum.oss.oinam.com',
    // Languages (BCP 47). en-US is canonical (served at root); ja is a full
    // 1:1 translation. Content lives in content/<code>/.
    defaultLocale: 'en-US',
    locales: [
      { code: 'en-US', label: 'English' },
      { code: 'ja', label: '日本語' },
    ],
    defaultTheme: 'auto',
    footer: 'Ovellum is MIT-licensed. Built with itself.',
    // This site IS Ovellum — no self-crediting link in the footer.
    credit: false,
    editUrlPattern: 'https://github.com/oinam/ovellum/edit/main/website/{path}',
    // Raw HTML, injected verbatim into <head>. Backticks mean third-party
    // snippets (which are full of double quotes) paste in with no escaping.
    // The font picker (Default / Serif / Inter / Geist) + text-size scale now
    // ship in the bundled appearance panel, so this site needs no typeface hack
    // — it dogfoods the real zero-webfont default (`site.font` left at 'sans').
    headExtra: `
      <script defer src="https://analytics.oinam.net/script.js" data-website-id="672bf7be-897e-423d-838b-ab70b056328f"></script>`,
    search: { enabled: true },
    pageMeta: { readingTime: false, lastModified: true },
    topbarNav: [
      { label: { 'en-US': 'Docs', ja: 'ドキュメント' }, href: '/docs/' },
      { label: 'GitHub', href: 'https://github.com/oinam/ovellum', icon: 'github', external: true },
      { label: 'npm', href: 'https://www.npmjs.com/package/ovellum', icon: 'package', external: true },
    ],
    footerNav: [
      { label: { 'en-US': 'Contributing', ja: 'コントリビュート' }, href: '/docs/contributing/' },
      { label: { 'en-US': 'Security', ja: 'セキュリティ' }, href: '/docs/reference/security/' },
      { label: 'Issues', href: 'https://github.com/oinam/ovellum/issues', external: true },
      { label: 'GitHub', href: 'https://github.com/oinam/ovellum', icon: 'github', external: true },
      { label: 'npm', href: 'https://www.npmjs.com/package/ovellum', icon: 'package', external: true },
      { label: { 'en-US': 'RSS feed', ja: 'RSS フィード' }, href: '/feed.xml', icon: 'rss' },
    ],
    landing: {
      enabled: true,
      docsHref: '/docs/',
      hero: {
        title: {
          'en-US': 'Auto, manual, or hybrid docs that never fall out of sync.',
          ja: '自動・手動・ハイブリッド、決して同期がずれないドキュメント。',
        },
        subtitle: {
          'en-US':
            'Ovellum is an open-source documentation tool for TypeScript and JavaScript. It lets auto-generated API docs and hand-written narrative live together in the same files, without conflict.',
          ja: 'Ovellum は TypeScript と JavaScript のためのオープンソースのドキュメントツールです。自動生成された API ドキュメントと手書きのナラティブを、競合なく同じファイルの中で共存させます。',
        },
        ctas: [
          { label: { 'en-US': 'Get started', ja: 'はじめる' }, href: '/docs/', style: 'primary' },
          {
            label: { 'en-US': 'View on GitHub', ja: 'GitHub で見る' },
            href: 'https://github.com/oinam/ovellum',
            style: 'secondary',
          },
        ],
      },
      install: [
        {
          title: { 'en-US': 'Install Ovellum globally', ja: 'Ovellum をグローバルにインストール' },
          code: 'npm install -g ovellum',
          lang: 'bash',
        },
        {
          title: { 'en-US': 'Run without installing', ja: 'インストールせずに実行' },
          code: 'npx ovellum init',
          lang: 'bash',
        },
        {
          title: { 'en-US': 'Add to a project', ja: 'プロジェクトに追加' },
          code: 'npm install -D ovellum',
          lang: 'bash',
        },
      ],
      features: [
        {
          title: { 'en-US': 'A Merge Engine', ja: 'マージエンジン' },
          href: '/docs/concepts/anchors-and-zones/',
          description: {
            'en-US':
              'Tag sections of your Markdown as human-owned with a single comment pair. Ovellum updates the auto-generated parts around them; your prose survives every rebuild.',
            ja: 'コメント 1 組で、Markdown のセクションを人間が所有する部分として印します。Ovellum はその周囲の自動生成部分だけを更新し、あなたの文章はどのリビルドでも生き残ります。',
          },
        },
        {
          title: { 'en-US': 'AI-Native', ja: 'AI ネイティブ' },
          href: '/docs/concepts/ai-ready/',
          description: {
            'en-US':
              'Every build emits `llms.txt` and per-page Markdown mirrors, so agents read your docs without scraping HTML. AI-ready out of the box.',
            ja: 'ビルドごとに `llms.txt` とページ単位の Markdown ミラーを出力するので、エージェントは HTML をスクレイピングせずにドキュメントを読めます。最初から AI 対応です。',
          },
        },
        {
          title: { 'en-US': 'Drive It Over MCP', ja: 'MCP で操作' },
          href: '/docs/guides/automation/',
          description: {
            'en-US':
              'Ovellum ships a Model Context Protocol server: agents query symbols, search, and diff — and write prose into protected zones that survive regeneration.',
            ja: 'Ovellum は Model Context Protocol サーバーを同梱します。エージェントはシンボルの検索・全文検索・diff、そして再生成を生き延びる保護ゾーンへの文章の書き込みができます。',
          },
        },
        {
          title: { 'en-US': 'Three Modes', ja: '3 つのモード' },
          href: '/docs/concepts/modes/',
          description: {
            'en-US':
              '`auto` regenerates from source. `manual` builds a static site from Markdown. `hybrid` (default) merges the two. Switch per-project or per-file.',
            ja: '`auto` はソースから再生成します。`manual` は Markdown から静的サイトを構築します。`hybrid`（デフォルト）は両者をマージします。プロジェクト単位でもファイル単位でも切り替えられます。',
          },
        },
        {
          title: { 'en-US': 'Orphans Quarantined', ja: '孤立ブロックを隔離' },
          href: '/docs/concepts/orphans/',
          description: {
            'en-US':
              'When you rename or delete a documented symbol, any hand-written prose tied to it gets archived to `.ovellum/orphans/`. Reviewable in PRs, recoverable any time.',
            ja: 'ドキュメント化されたシンボルの名前を変更・削除すると、それに結びついた手書きの文章は `.ovellum/orphans/` にアーカイブされます。PR でレビューでき、いつでも復元できます。',
          },
        },
        {
          title: { 'en-US': 'Deploy Anywhere', ja: 'どこへでもデプロイ' },
          href: '/docs/guides/deploy/',
          description: {
            'en-US':
              '`ovellum build` produces a self-contained folder — HTML, CSS, ~2 KB of JS. Host it on anything static, or embed it in another build.',
            ja: '`ovellum build` は自己完結したフォルダ（HTML・CSS・約 2KB の JS）を生成します。任意の静的ホストに置くか、別のビルドに埋め込めます。',
          },
        },
      ],
      scenes: [],
    },
  },
} satisfies OvellumUserConfig;
