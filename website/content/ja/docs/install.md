---
title: インストール
description: pnpm、npm、yarn、bun を使って Ovellum をプロジェクトに追加する。
sourceHash: 'd4a64441e8f72257'
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
ovellum upgrade            # プロジェクト内から → プロジェクトのローカルコピーをアップグレード
```

`upgrade` は、**ローカル依存を見つけたら必ずそちらを対象にします** — カレントディレクトリの
`package.json` が `ovellum` を宣言していれば（あるいは既に `node_modules` にあれば）、
グローバルバイナリで呼び出した場合でも、プロジェクトに対して `… add -D ovellum@latest` を
実行します。そうしたプロジェクトの外にいるときだけ、グローバルインストールにフォールバック
します。どちらを更新しようとしているかは表示されます:

```text
Update available: 0.10.0 → 0.10.1 (this project's local dependency).
Run `pnpm add -D ovellum@latest`?
```

パッケージマネージャーはプロジェクトのロックファイル（`pnpm-lock.yaml`、`yarn.lock` など）
から判定されるので、`pnpm` プロジェクトは素のグローバルバイナリからでも `pnpm` で
アップグレードされます。`--dry-run` でプレビューしたり、`--yes` で確認をスキップしたり
できます。（[`upgrade` リファレンス](/ja/docs/reference/cli/#ovellum-upgrade)を参照してください。）
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

### グローバル vs. プロジェクトローカル

`ovellum upgrade` は宣言されたローカル依存を優先するため、かつての落とし穴 — 素の
`ovellum upgrade` がプロジェクトを固定したまま**グローバル**インストールだけをこっそり
更新してしまう — は、通常のプロジェクト内ではもう起きません。判定は単純で、「このディレクトリの
`package.json` は `ovellum` に言及しているか？」だけです。言及していれば、プロジェクトが
優先されます。

知っておくべきエッジケースが 2 つあります:

- **依存が宣言されていないプロジェクト。** ディレクトリの `package.json` に `ovellum` が
  なく、`node_modules` にもない場合、`upgrade` はグローバルインストールとして扱います。
  先にプロジェクトへ追加（`npm install -D ovellum`）してから再実行してください。
- **本当にグローバルを更新したい場合。** Ovellum プロジェクトではないディレクトリから
  `upgrade` を実行するか、手動でインストールしてください: `npm install -g ovellum@latest`。

どちらのコピーを使っているか確認するには:

```bash
grep ovellum package.json          # プロジェクトが固定している範囲
npx ovellum --version              # `npx` はローカルコピーを実行
```

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
