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

```bash
pnpm update ovellum
# or:
npm update ovellum
```

Ovellum は semver に従います。1.0 より前のリリースでは、マイナーバージョンでも破壊的変更が
含まれることがあります。バージョンを上げる前に
[リリースノート](https://github.com/oinam/ovellum/releases)を確認してください。

## アンインストール

```bash
pnpm remove ovellum
```

出力ディレクトリ（`dist/`、`docs/`、または `output` で指定した場所）はあなたのものです。
Ovellum をアンインストールしても、それは手つかずのまま残ります。準備ができたときに
いつでも手動で削除できます。
