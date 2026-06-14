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
    version: 'v0.11.0',
    description:
      'Markdown documentation for TypeScript and JavaScript projects. A merge engine that lets auto-generated API docs and hand-written prose coexist in the same files, plus a Jekyll-style static-site builder for purely manual docs.',
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
          'en-US': "Documentation that doesn't drift.",
          ja: 'ドリフトしないドキュメント。',
        },
        subtitle: {
          'en-US':
            'Ovellum is an open-source documentation tool for TypeScript and JavaScript. Auto-generate from source, hand-write narrative pages, or mix both in the same file. Your prose never gets silently overwritten.',
          ja: 'Ovellum は TypeScript と JavaScript のためのオープンソースのドキュメントツールです。ソースから自動生成し、説明的なページを手で書き、あるいは同じファイルで両方を混在させられます。あなたの文章が知らぬ間に上書きされることはありません。',
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
          description: {
            'en-US':
              'Tag sections of your Markdown as human-owned with a single comment pair. Ovellum updates the auto-generated parts around them; your prose survives every rebuild.',
            ja: 'コメント 1 組で、Markdown のセクションを人間が所有する部分として印します。Ovellum はその周囲の自動生成部分だけを更新し、あなたの文章はどのリビルドでも生き残ります。',
          },
        },
        {
          title: { 'en-US': 'Three Modes', ja: '3 つのモード' },
          description: {
            'en-US':
              '`auto` regenerates from source. `manual` builds a static site from Markdown. `hybrid` (default) merges the two. Switch per-project or per-file.',
            ja: '`auto` はソースから再生成します。`manual` は Markdown から静的サイトを構築します。`hybrid`（デフォルト）は両者をマージします。プロジェクト単位でもファイル単位でも切り替えられます。',
          },
        },
        {
          title: { 'en-US': 'Orphans Quarantined', ja: '孤立ブロックを隔離' },
          description: {
            'en-US':
              'When you rename or delete a documented symbol, any hand-written prose tied to it gets archived to `.ovellum/orphans/`. Reviewable in PRs, recoverable any time.',
            ja: 'ドキュメント化されたシンボルの名前を変更・削除すると、それに結びついた手書きの文章は `.ovellum/orphans/` にアーカイブされます。PR でレビューでき、いつでも復元できます。',
          },
        },
      ],
      scenes: [],
    },
  },
} satisfies OvellumUserConfig;
