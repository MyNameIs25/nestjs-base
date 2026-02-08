<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

# NestJS Monorepo

**0/initialization** ブランチから派生した NestJS monorepo プロジェクトです。
複数のアプリが共通ライブラリを共有し、さまざまなライブラリ実装（ロギング、エラーハンドリング、設定など）を比較します。

## プロジェクト構成

```text
├── apps/
│   └── auth/                       # Auth マイクロサービス
│       ├── src/
│       │   ├── main.ts             # ブートストラップエントリポイント
│       │   ├── auth.module.ts      # ルートモジュール
│       │   ├── auth.controller.ts
│       │   └── auth.service.ts
│       ├── test/                   # E2E テスト
│       ├── package.json            # アプリレベルの依存関係
│       └── tsconfig.app.json
├── libs/
│   └── common/                     # 共有ライブラリ (@app/common)
│       ├── src/
│       │   ├── index.ts            # 公開 API バレルファイル
│       │   ├── common.module.ts
│       │   └── common.service.ts
│       └── tsconfig.lib.json
├── docker/
│   ├── base.yml                    # 共有 Docker Compose サービステンプレート
│   └── auth/
│       ├── compose.override.yml    # Auth 固有の compose オーバーライド
│       └── .env.docker             # APP_NAME=auth
├── docker-compose.yml              # 各アプリの compose ファイルをインクルード
├── Dockerfile                      # マルチステージビルド（development + production）
├── Makefile                        # Docker 便利コマンド
├── nest-cli.json                   # Monorepo プロジェクト定義
├── pnpm-workspace.yaml             # ワークスペース定義
└── tsconfig.json                   # ルート TS 設定とパスエイリアス
```

## Monorepo 設計

本プロジェクトは **NestJS monorepo** と **pnpm workspaces** を使用して依存関係を管理しています。

### 仕組み

- **`nest-cli.json`** はすべてのアプリとライブラリを `"monorepo": true` で登録します。NestJS CLI はこれを使用して、正しいプロジェクトのビルド、起動、コード生成を行います。
- **`pnpm-workspace.yaml`** は `apps/*` をワークスペースパッケージとして宣言し、各アプリに独自の `package.json` を持たせて依存関係を分離します。
- **`tsconfig.json`** はパスエイリアス（例：`@app/common`）を定義し、どのアプリからでも相対パスなしで共有ライブラリをインポートできます。
- 各アプリは独自の `main.ts` エントリポイント、ルートモジュール、ビルド設定を持ち、独立してビルド・デプロイが可能です。
- ライブラリ（`libs/`）にはパスエイリアスで参照される共有コードが含まれ、ビルド時に各アプリにバンドルされます——独立したパッケージとしては公開されません。

### メリット

- **コードの重複なし** — 共通のユーティリティ、モジュール、型は `libs/` に配置し、どのアプリからでも `@app/common` 経由でインポートできます。
- **アトミックな変更** — 1回のコミットで共有ライブラリとそれを使用するすべてのアプリを更新でき、バージョンのずれを防ぎます。
- **統一されたツールチェーン** — コードベース全体で ESLint、Prettier、TypeScript、Jest の設定を共有します。
- **シンプルな依存関係管理** — pnpm workspaces が共有依存関係をホイストし、ディスク使用量とインストール時間を削減します。
- **独立デプロイ** — 各アプリはそれぞれの `dist/` にビルドされ、個別にデプロイできます。

### デメリット

- **ビルドの結合** — 共有ライブラリの変更は、それに依存するすべてのアプリの再ビルドが必要です。CI パイプラインは依存関係グラフを把握する必要があります。
- **スケーラビリティの制限** — アプリ数の増加に伴い、インストールとビルドの時間も増加します。大規模な monorepo では Nx や Turborepo などのツールによるインクリメンタルビルドが必要になる場合があります。
- **依存関係バージョンの共有** — すべてのアプリがルートレベルの依存関係の同じバージョンを共有します。パッケージ（例：NestJS）のアップグレードはすべてに影響します。
- **IDE パフォーマンス** — 多くのプロジェクトを含む大規模な monorepo は TypeScript 言語サーバーやファイルインデックスを遅くする可能性があります。

## Docker 設計

Docker 構成は**単一のパラメータ化された Dockerfile** と**コンポーザブルな Docker Compose 構造**を使用し、マイクロサービスの数に応じてスケールします。

### Dockerfile

`APP_NAME` でパラメータ化された2ステージのマルチステージビルド：

| ステージ | 目的 |
| --- | --- |
| **development** | すべての依存関係をインストールし、ソースをコピーして `pnpm run build` を実行。compose と組み合わせてホットリロード開発に使用。 |
| **production** | 本番依存関係のみをインストールし、development ステージからビルド済みの `dist/` をコピー。`node dist/apps/<APP_NAME>/main` を実行。 |

同じ Dockerfile でどのアプリもビルドできます——`APP_NAME` ビルド引数を変えるだけです。

### Docker Compose

Compose 構成は共有設定と各アプリのオーバーライドを分離します：

```text
docker-compose.yml              ← 各アプリの compose ファイルをインクルード
docker/
  base.yml                      ← 共有サービステンプレート（ビルド、環境、ボリューム、コマンド）
  auth/
    compose.override.yml        ← アプリ固有のオーバーライド（サービス名、ポート）
    .env.docker                 ← APP_NAME=auth
```

- **`docker/base.yml`** — `${APP_NAME}` 変数補間を使用した再利用可能なサービステンプレートを定義します。ビルドコンテキスト、ビルド引数、コンテナ命名、開発コマンド（`pnpm run start:dev`）、環境変数、ソースボリュームマウント（ホットリロード対応）を処理します。
- **`docker/<app>/compose.override.yml`** — 各アプリ固有の設定のみを含みます：サービス名とポートマッピング。それ以外は `extends` で継承されます。
- **`docker-compose.yml`** — `include` を使用して各アプリの compose ファイルを取り込み、`project_directory: .` でプロジェクトルートからのパス解決を行い、`env_file` で `APP_NAME` 変数を注入します。

### Makefile

| コマンド | 説明 |
| --- | --- |
| `make build` | すべての Docker イメージをビルド |
| `make up` | すべてのコンテナをバックグラウンドで起動 |
| `make down` | すべてのコンテナを停止・削除 |
| `make logs` | インタラクティブなサービスセレクター——実行中のコンテナを一覧表示し、選択したサービスのログを追跡 |

## 新しいマイクロサービスの追加

### 1. NestJS アプリを生成

```bash
nest generate app <app-name>
```

`apps/<app-name>/` ディレクトリにソースファイルと `tsconfig.app.json` が作成され、`nest-cli.json` にプロジェクトが登録されます。

### 2. Docker 設定を作成

```bash
mkdir docker/<app-name>
```

`docker/<app-name>/.env.docker` を作成：

```text
APP_NAME=<app-name>
```

`docker/<app-name>/compose.override.yml` を作成：

```yaml
services:
  <app-name>:
    extends:
      file: docker/base.yml
      service: app
    ports:
      - '<port>:<port>'
```

### 3. Docker Compose に登録

`docker-compose.yml` に追加：

```yaml
  - path: docker/<app-name>/compose.override.yml
    project_directory: .
    env_file: docker/<app-name>/.env.docker
```

### 4. ビルドと実行

```bash
make build && make up
make logs                # 新しいサービスを選択
```

## 開発

```bash
pnpm install                        # すべての依存関係をインストール
pnpm run start:dev                  # 開発サーバー（auth）ウォッチモード
pnpm run start:dev <app-name>       # 特定のアプリの開発サーバー
pnpm run lint                       # ESLint 自動修正
pnpm run format                     # Prettier フォーマット
pnpm run test                       # ユニットテスト
pnpm run test:e2e                   # E2E テスト
pnpm run test:cov                   # テストカバレッジ
```
