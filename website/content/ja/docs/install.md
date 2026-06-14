---
title: インストール
description: pnpm、npm、yarn、bun を使って Ovellum をプロジェクトに追加する。
---

# インストール

Ovellum は単一の npm パッケージ（`ovellum`）として提供されます。これはビルド時の CLI であり、
ランタイムのバンドルには何も追加しません。

## 必要条件

- **Node.js 20 以降。** Node 18 は 2025年4月にサポート終了を迎えました。私たちは
  これをサポートしません。
- **TypeScript または JavaScript のプロジェクト。** Ovellum はどちらでも動作します。
  マニュアルモードでは `tsconfig.json` は不要です。

## プロジェクトへの追加

### pnpm

```bash
pnpm add -D ovellum
```

### npm

```bash
npm install --save-dev ovellum
```

### yarn

```bash
yarn add --dev ovellum
```

### bun

```bash
bun add -d ovellum
```

## インストールせずに使う

Ovellum を依存関係としてコミットしたくない場合は、`npx` を介して実行できます:

```bash
npx ovellum build
```

最初の呼び出しでパッケージがダウンロードされ、キャッシュされます。以降の実行では
キャッシュが再利用されます。これは一度きりの生成には便利ですが、パッケージマネージャーが
実行ごとに再解決しなければならないため、CI を遅くします。繰り返しビルドする場合は、
`--save-dev` でのインストールを推奨します。

## グローバルインストール

プロジェクトローカルの依存関係（上記）を推奨します。プロジェクトごとにバージョンを固定でき、
CI ビルドの再現性を保てます。とはいえ、`ovellum` コマンドをどこでも使えるようにしたい場合
（スキャフォールディングや一度きりのビルドに便利）は、グローバルにインストールしてください:

```bash
npm install -g ovellum
# or:
pnpm add -g ovellum
yarn global add ovellum
bun add -g ovellum
```

その後は `npx` なしで直接実行できます:

```bash
ovellum --version
ovellum build
```

グローバルインストールは、すべてのプロジェクトに対して単一のバージョンを `PATH` に置きます。
2つのプロジェクトで異なるバージョンが必要な場合は、それぞれが自分のバージョンを固定できるよう、
代わりにプロジェクトローカルのインストールを使ってください。（どちらの場合も Node 20 以降です。）

## インストールの確認

インストール後、次を実行します:

```bash
npx ovellum build --help   # project-local; for a global install, drop `npx`
```

`build` サブコマンドの概要が表示されるはずです。「command not found」と表示される場合は、
インストールしたプロジェクト内にいることと、パッケージマネージャーのバイナリが `PATH` に
あることを確認してください（pnpm では追加で `pnpm setup` が必要なことがあります）。

## アップグレード

組み込みコマンドが npm で最新リリースを確認し、お使いのパッケージマネージャーで
再インストールします:

```bash
npx ovellum upgrade        # upgrade THIS project's Ovellum
ovellum upgrade            # upgrade the GLOBAL Ovellum (see the gotcha below)
```

これは**呼び出した側の Ovellum**をアップグレードします。そのため、プロジェクト内からは
`npx ovellum upgrade`（または npm スクリプト）を実行してください — これはプロジェクトの
ローカルコピーを対象にします。素の `ovellum` はグローバルのものを実行します。`--dry-run`
でプレビューしたり、`--yes` で確認をスキップしたりできます。（[`upgrade` リファレンス](/ja/docs/reference/cli/#ovellum-upgrade)を参照してください。）
また Ovellum は、より新しいバージョンが存在するとき、コマンドの実行後に
*「update available」* の通知を一行で表示します（キャッシュされます。設定で
`update: { check: false }` を指定すると無効化できます）。

### 手動でアップグレードする

パッケージマネージャーを自分で実行したい場合は、明示的に **`@latest`** を
インストールしてください:

```bash
pnpm add -D ovellum@latest
# or: npm install -D ovellum@latest  ·  yarn add -D ovellum@latest  ·  bun add -d ovellum@latest
```

> **なぜ `npm update` ではなく `@latest` なのか？** Ovellum はまだ 1.0 より前であり、
> キャレット範囲 — `"ovellum": "^0.9.0"`、インストーラーがデフォルトで書き込むもの — は
> `0.x` バージョンでは `>=0.9.0 <0.10.0` を意味します。つまり**マイナーを固定する**のです。
> そのため `npm update ovellum` / `pnpm update ovellum` は `0.9.x` のパッチは取得しますが、
> **`0.10.0` には上げてくれません**。`ovellum@latest` をインストールすると範囲が書き換えられ、
> 最新リリースを取得できます。（`ovellum upgrade` はこれを代わりに行います。）

**グローバル**インストールの場合は、インストールしたときと同じ方法でアップグレードします:
`npm install -g ovellum@latest`（自分のパッケージマネージャーに置き換えてください）。

### グローバル vs. プロジェクトローカル — よくある落とし穴

グローバルの Ovellum とプロジェクトの devDependency を**両方**持っている場合、間違った方を
アップグレードしてしまいがちです。その兆候は次のとおりです:

> `ovellum --version` は新しいバージョンを表示するのに、プロジェクトの `package.json` は
> 依然として古いバージョンを固定している（例: `"ovellum": "^0.5.1"`）。

これは、プロジェクトではなく**グローバル**の Ovellum をアップグレードしてしまったということです。
シェルで素の `ovellum` を実行するとグローバルのバイナリが動く（素のシェルは
`node_modules/.bin` を `PATH` に追加しません）ため、`ovellum upgrade` はグローバルを
更新し、プロジェクトはそのまま残されたのです。

確実な解決策は、プロジェクトに直接インストールすることです — これにより `package.json` と
ロックファイルの両方が書き換えられます:

```bash
cd your-project
npm install -D ovellum@latest      # or pnpm/yarn/bun equivalent
```

そのうえで、（グローバルではなく）プロジェクトを修正できたことを確認します:

```bash
grep ovellum package.json          # → "ovellum": "^0.10.0"
npx ovellum --version              # `npx` runs the LOCAL copy → the new version
```

この混同を完全に避けるには、プロジェクト内では常に Ovellum を **`npx ovellum …`**
（または npm スクリプト経由）で呼び出してローカルインストールを使うようにし、いっそ
グローバルのものは持たない（`npm rm -g ovellum`）ことも検討してください。

> **CI へプッシュする？** 更新した `package.json` **と**ロックファイル
> （`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`）の両方をコミット
> してください。`npm ci` のような CI ステップはロックファイルから厳密にインストールするため、
> ロックファイルが古いまたは存在しないと、CI は古い Ovellum でビルドする（または不一致で
> 失敗する）ことになります。

Ovellum は semver に従います。1.0 より前のリリースでは、**マイナー**バージョンでも
破壊的変更が含まれることがあります。バージョンを上げる前に
[リリースノート](https://github.com/oinam/ovellum/releases)を確認してください。

## アンインストール

```bash
pnpm remove ovellum
```

出力ディレクトリ（`dist/`、`docs/`、または `output` で指定した場所）はあなたのものです。
Ovellum をアンインストールしても、それは手つかずのまま残ります。準備ができたときに
いつでも手動で削除できます。
