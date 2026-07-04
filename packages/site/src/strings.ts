/**
 * UI-chrome string table for the static-site template. Every hardcoded English
 * label rendered by the template comes from here, so a non-default locale shows
 * translated chrome (not just translated page content).
 *
 * Resolution order (English fills any gap; a config override wins):
 *   DEFAULT_STRINGS → BUILTIN_STRINGS[base-language] → per-locale `strings`.
 *
 * The default English single-language output stays byte-for-byte identical:
 * `resolveStrings(undefined)` returns exactly `DEFAULT_STRINGS`.
 *
 * Proper nouns (palette names — Ovellum, E-ink, Flexoki, Nord, Solarized; font
 * names — Inter, Geist) are intentionally NOT keyed here; they stay literal.
 */
export interface UiStrings {
  tocTitle: string;
  editedLabel: string;
  minRead: string;
  today: string;
  yesterday: string;
  docsLink: string;
  languageLabel: string;
  versionLabel: string;
  previous: string;
  next: string;
  pageNav: string;
  backToTop: string;
  editThisPage: string;
  breadcrumb: string;
  siteNav: string;
  primaryNav: string;
  mobileNav: string;
  footerNav: string;
  openMenu: string;
  builtWith: string;
  draftLabel: string;
  draftRibbonNote: string;
  /** Old-version banner text; `{version}` is replaced with the version label. */
  oldVersionNote: string;
  /** Old-version banner link text → the latest version. */
  oldVersionSwitch: string;
  appearance: string;
  modeGroup: string;
  modeLabel: string;
  modeAuto: string;
  modeLight: string;
  modeDark: string;
  themeGroup: string;
  themeLabel: string;
  colorGroup: string;
  colorLabel: string;
  accentDefault: string;
  accentCustom: string;
  accentBlue: string;
  accentViolet: string;
  accentGreen: string;
  accentAmber: string;
  accentRose: string;
  accentTeal: string;
  textSizeGroup: string;
  textSizeLabel: string;
  textSmallest: string;
  textSmall: string;
  textDefault: string;
  textLarge: string;
  textLargest: string;
  fontGroup: string;
  fontLabel: string;
  fontSans: string;
  fontSerif: string;
  pageNotFoundTitle: string;
  pageNotFoundBody: string;
  goHome: string;
  copy: string;
  copied: string;
  copyCode: string;
  copyPage: string;
  viewMarkdown: string;
  askChatGpt: string;
  askClaude: string;
}

export const DEFAULT_STRINGS: UiStrings = {
  tocTitle: 'On this page',
  editedLabel: 'Edited',
  minRead: 'min read',
  today: 'today',
  yesterday: 'yesterday',
  docsLink: 'Docs',
  languageLabel: 'Language',
  versionLabel: 'Version',
  previous: 'Previous',
  next: 'Next',
  pageNav: 'Page navigation',
  backToTop: 'Back to top',
  editThisPage: 'Edit this page',
  breadcrumb: 'Breadcrumb',
  siteNav: 'Site navigation',
  primaryNav: 'Primary',
  mobileNav: 'Mobile',
  footerNav: 'Site links',
  openMenu: 'Open menu',
  builtWith: 'Built with Ovellum',
  draftLabel: 'Draft',
  draftRibbonNote: 'visible locally only, never published',
  oldVersionNote: 'This is documentation for {version}, not the latest version.',
  oldVersionSwitch: 'Switch to the latest',
  appearance: 'Appearance',
  modeGroup: 'Color mode',
  modeLabel: 'Mode',
  modeAuto: 'Auto',
  modeLight: 'Light',
  modeDark: 'Dark',
  themeGroup: 'Theme',
  themeLabel: 'Theme',
  colorGroup: 'Primary color',
  colorLabel: 'Color',
  accentDefault: 'Default',
  accentCustom: 'Custom color',
  accentBlue: 'Blue',
  accentViolet: 'Violet',
  accentGreen: 'Green',
  accentAmber: 'Amber',
  accentRose: 'Rose',
  accentTeal: 'Teal',
  textSizeGroup: 'Text size',
  textSizeLabel: 'Text size',
  textSmallest: 'Smallest',
  textSmall: 'Small',
  textDefault: 'Default',
  textLarge: 'Large',
  textLargest: 'Largest',
  fontGroup: 'Font family',
  fontLabel: 'Font',
  fontSans: 'Sans-Serif (Default)',
  fontSerif: 'Serif',
  pageNotFoundTitle: 'Page not found',
  pageNotFoundBody: 'The page you’re looking for doesn’t exist or may have moved.',
  goHome: 'Go to the homepage',
  copy: 'Copy',
  copied: 'Copied',
  copyCode: 'Copy code',
  copyPage: 'Copy page',
  viewMarkdown: 'View as Markdown',
  askChatGpt: 'Open in ChatGPT',
  askClaude: 'Open in Claude',
};

/**
 * Built-in translations, keyed by BCP 47 *base* language (lowercased — `'ja'`
 * matches `'ja'` and `'ja-JP'`). Partial: any omitted key falls back to English
 * via {@link resolveStrings}.
 */
export const BUILTIN_STRINGS: Record<string, Partial<UiStrings>> = {
  ja: {
    tocTitle: 'このページの内容',
    editedLabel: '最終更新',
    minRead: '分で読めます',
    today: '今日',
    yesterday: '昨日',
    docsLink: 'ドキュメント',
    languageLabel: '言語',
    versionLabel: 'バージョン',
    previous: '前へ',
    next: '次へ',
    pageNav: 'ページナビゲーション',
    backToTop: 'トップへ戻る',
    editThisPage: 'このページを編集',
    breadcrumb: 'パンくずリスト',
    siteNav: 'サイトナビゲーション',
    primaryNav: 'メイン',
    mobileNav: 'モバイル',
    footerNav: 'サイトリンク',
    openMenu: 'メニューを開く',
    builtWith: 'Ovellum で構築',
    draftLabel: '下書き',
    draftRibbonNote: 'ローカルでのみ表示され、公開されません',
    oldVersionNote: 'これは {version} のドキュメントで、最新バージョンではありません。',
    oldVersionSwitch: '最新版に切り替える',
    appearance: '外観',
    modeGroup: 'カラーモード',
    modeLabel: 'モード',
    modeAuto: '自動',
    modeLight: 'ライト',
    modeDark: 'ダーク',
    themeGroup: 'テーマ',
    themeLabel: 'テーマ',
    colorGroup: 'アクセントカラー',
    colorLabel: 'カラー',
    accentDefault: 'デフォルト',
    accentCustom: 'カスタムカラー',
    accentBlue: '青',
    accentViolet: '紫',
    accentGreen: '緑',
    accentAmber: '琥珀',
    accentRose: 'ローズ',
    accentTeal: 'ティール',
    textSizeGroup: '文字サイズ',
    textSizeLabel: '文字サイズ',
    textSmallest: '最小',
    textSmall: '小',
    textDefault: '標準',
    textLarge: '大',
    textLargest: '最大',
    fontGroup: 'フォント',
    fontLabel: 'フォント',
    fontSans: 'サンセリフ（デフォルト）',
    fontSerif: 'セリフ',
    pageNotFoundTitle: 'ページが見つかりません',
    pageNotFoundBody: 'お探しのページは存在しないか、移動した可能性があります。',
    goHome: 'ホームページへ移動',
    copy: 'コピー',
    copied: 'コピーしました',
    copyCode: 'コードをコピー',
    copyPage: 'ページをコピー',
    viewMarkdown: 'Markdown で表示',
    askChatGpt: 'ChatGPT で開く',
    askClaude: 'Claude で開く',
  },
};

/** Right-to-left base languages — drives `<html dir="rtl">`. */
export const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv']);

/** Lowercased part before the first `-` (`'ja'` from `'ja'`, `'en'` from `'en-US'`). */
export function baseLang(code: string): string {
  return code.split('-')[0]!.toLowerCase();
}

/** Whether a locale code is a right-to-left language. */
export function isRtl(code: string | undefined): boolean {
  return code ? RTL_LANGS.has(baseLang(code)) : false;
}

/**
 * Resolve the UI strings for a locale. English fills any gap left by the
 * built-in translation; a per-locale config `override` wins over both. Passing
 * `undefined` returns exactly {@link DEFAULT_STRINGS} (the single-language path,
 * so the default output stays byte-for-byte identical).
 */
export function resolveStrings(
  code: string | undefined,
  override?: Partial<UiStrings>,
): UiStrings {
  return {
    ...DEFAULT_STRINGS,
    ...(code ? (BUILTIN_STRINGS[baseLang(code)] ?? {}) : {}),
    ...(override ?? {}),
  };
}

/**
 * Resolve a config-driven localizable string for the current locale. A plain
 * `string` passes through unchanged. A per-locale map resolves to the current
 * `code`, falling back to `defaultLocale`, then the first entry. `undefined`
 * resolves to `''`. Crucially, `localize('Docs', undefined, undefined) === 'Docs'`,
 * so single-language sites stay byte-for-byte identical.
 */
export function localize(
  value: string | Record<string, string> | undefined,
  code: string | undefined,
  defaultLocale: string | undefined,
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (code && value[code] != null) return value[code];
  if (defaultLocale && value[defaultLocale] != null) return value[defaultLocale];
  const first = Object.values(value)[0];
  return first ?? '';
}
