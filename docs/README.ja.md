<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

[![CI](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml/badge.svg)](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml)

# NestJS Monorepo

**Nx** をビルドオーケストレーションに使用し、**2/setup-nx-for-monorepo** から派生した NestJS monorepo プロジェクトです。
**設定モジュール**（`@app/common`）を追加し、`@nestjs/config` を Zod バリデーションと名前空間化された設定ファクトリーでラップします。

## プロジェクト構成

```text
├── apps/
│   ├── auth/                       # Auth マイクロサービス（デフォルト、ポート 3000）
│   │   ├── src/
│   │   │   ├── main.ts             # ブートストラップエントリポイント
│   │   │   ├── auth.module.ts      # ルートモジュール
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── test/                   # E2E テスト
│   │   ├── package.json            # アプリレベルの依存関係
│   │   ├── project.json            # Nx プロジェクト設定
│   │   ├── jest.config.ts          # プロジェクト別 Jest 設定
│   │   └── tsconfig.app.json
│   └── payments/                   # Payments マイクロサービス（ポート 3001）
├── libs/
│   └── common/                     # 共有ライブラリ (@app/common)
│       ├── src/
│       │   ├── index.ts            # 公開 API バレルファイル
│       │   ├── common.module.ts
│       │   └── common.service.ts
│       ├── project.json            # Nx プロジェクト設定
│       ├── jest.config.ts          # プロジェクト別 Jest 設定
│       └── tsconfig.lib.json
├── docker/
│   ├── base.yml                    # 共有 Docker Compose サービステンプレート
│   ├── auth/
│   │   ├── compose.override.yml    # Auth 固有の compose オーバーライド
│   │   └── .env.docker             # APP_NAME=auth
│   └── payments/
│       ├── compose.override.yml    # Payments 固有の compose オーバーライド
│       └── .env.docker             # APP_NAME=payments
├── docker-compose.yml              # 各アプリの compose ファイルをインクルード
├── Dockerfile                      # マルチステージビルド（development + production）
├── Makefile                        # Docker 便利コマンド
├── nx.json                         # Nx ワークスペース設定（キャッシュ、パイプライン）
├── jest.preset.js                  # 共有 Jest プリセット
├── nest-cli.json                   # Monorepo プロジェクト定義
├── pnpm-workspace.yaml             # ワークスペース定義
└── tsconfig.json                   # ルート TS 設定とパスエイリアス
```

## Monorepo 設計

本プロジェクトは **NestJS monorepo** と **pnpm workspaces** を使用して依存関係を管理し、**Nx** でビルドオーケストレーション、計算キャッシュ、モジュール境界の強制を行います。

### 仕組み

- **`nest-cli.json`** はすべてのアプリとライブラリを `"monorepo": true` で登録します。NestJS CLI はこれを使用して、正しいプロジェクトのビルド、起動、コード生成を行います。
- **`pnpm-workspace.yaml`** は `apps/*` をワークスペースパッケージとして宣言し、各アプリに独自の `package.json` を持たせて依存関係を分離します。
- **`tsconfig.json`** はパスエイリアス（例：`@app/common`）を定義し、どのアプリからでも相対パスなしで共有ライブラリをインポートできます。
- **Nx** がビルド、テスト、リントを計算キャッシュと `affected` コマンドで編成します。各プロジェクトにはターゲットとタグを定義する `project.json` があります。
- 各アプリは独自の `main.ts` エントリポイント、ルートモジュール、ビルド設定を持ち、独立してビルド・デプロイが可能です。
- ライブラリ（`libs/`）にはパスエイリアスで参照される共有コードが含まれ、ビルド時に各アプリにバンドルされます——独立したパッケージとしては公開されません。

### メリット

- **コードの重複なし** — 共通のユーティリティ、モジュール、型は `libs/` に配置し、どのアプリからでも `@app/common` 経由でインポートできます。
- **アトミックな変更** — 1回のコミットで共有ライブラリとそれを使用するすべてのアプリを更新でき、バージョンのずれを防ぎます。
- **統一されたツールチェーン** — コードベース全体で ESLint、Prettier、TypeScript、Jest の設定を共有します。
- **シンプルな依存関係管理** — pnpm workspaces が共有依存関係をホイストし、ディスク使用量とインストール時間を削減します。
- **独立デプロイ** — 各アプリはそれぞれの `dist/` にビルドされ、個別にデプロイできます。

### デメリット

- **ビルドの結合** — 共有ライブラリの変更は、それに依存するすべてのアプリの再ビルドが必要です。Nx の `affected` コマンドにより、変更された部分のみを再ビルドすることで緩和されます。
- **スケーラビリティの制限** — アプリ数の増加に伴い、インストールとビルドの時間も増加します。Nx の計算キャッシュとタスクグラフオーケストレーションにより、未変更の作業をスキップすることで対処します。
- **依存関係バージョンの共有** — すべてのアプリがルートレベルの依存関係の同じバージョンを共有します。パッケージ（例：NestJS）のアップグレードはすべてに影響します。
- **IDE パフォーマンス** — 多くのプロジェクトを含む大規模な monorepo は TypeScript 言語サーバーやファイルインデックスを遅くする可能性があります。

## 設定モジュール設計

設定モジュール（`libs/common/src/config/`）は `@nestjs/config` を **Zod バリデーション**と**名前空間ファクトリーパターン**でラップし、各設定名前空間が起動時にバリデーションされ、NestJS DI 経由で注入されるようにします。

### 仕組み

- **`createNamespacedConfig({ key, schema })`** は、起動時に Zod スキーマで `process.env` をバリデーションする設定ファクトリーを作成します。`@Inject()` 用の `.KEY` インジェクショントークンを持つファクトリーを返します。ファクトリーは `z.infer<TSchema>` を直接返すため、プロパティ名は環境変数名と一致します（例：`config.database.DB_HOST`）。
- **`AppConfigModule.forRoot({ namespaces })`** は `ConfigModule.forRoot()` をラップします。常にベースの `appConfig`（NODE_ENV、SERVICE_NAME）を読み込み、`namespaces[]` で渡された追加の名前空間ファクトリーをマージします。`isGlobal: true` と `cache: true` を設定します。
- **アプリレベルの設定サービス**（例：`AuthConfigService`）は `@Inject(factory.KEY)` を使用して、バリデーション済みの設定オブジェクトをコンストラクタパラメータとして受け取ります。アプリモジュールの通常のプロバイダーとして登録されます。

### フロー

```text
.env → Zod スキーマが process.env をバリデーション → @Inject(factory.KEY) が設定を注入
```

### 例

スキーマファイル（`apps/auth/src/config/schemas/database.config.ts`）：

```typescript
const databaseSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
});

export const databaseConfig = createNamespacedConfig({
  key: 'database',
  schema: databaseSchema,
});
```

設定サービス（`apps/auth/src/config/config.service.ts`）：

```typescript
@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(appConfig.KEY) readonly app: AppConfig,
    @Inject(databaseConfig.KEY) readonly database: DatabaseConfig,
  ) {}
}
```

アプリモジュールは名前空間を登録し、設定サービスをプロバイダーとして追加します：

```typescript
@Module({
  imports: [AppConfigModule.forRoot({ namespaces: [databaseConfig] })],
  providers: [AuthConfigService, AuthService],
})
export class AuthModule {}
```

### メリット

- **起動時のフェイルファスト** — 無効または不足している環境変数は、名前空間名を含む明確なエラーメッセージとともに起動時にスローされ、実行時にサイレントに失敗しません。
- **型安全な設定** — `ConfigType<typeof factory>` が正確な型を推論するため、`config.database.DB_HOST` は手動インターフェースなしで `string` として型付けされます。
- **クリーンな DI** — `@Inject(factory.KEY)` は NestJS のネイティブ DI を使用します。ラッパークラスや抽象基底クラスは不要です。
- **最小限のボイラープレート** — 名前空間の定義に必要なのは `key` と `schema` のみです。環境変数名とプロパティ名の間のマッピング層は不要です。
- **名前空間の分離** — 各名前空間は独立してバリデーション・注入されます。新しい名前空間の追加は既存のものに影響しません。

### デメリット

- **間接層** — `createNamespacedConfig` は `@nestjs/config` の `registerAs` の上に抽象化を追加します。開発者はラッパーと基盤ライブラリの両方を理解する必要があります。
- **二重登録** — 名前空間はモジュールの `forRoot({ namespaces })` と設定サービスの `@Inject()` の両方に宣言する必要があります。設定ファクトリーはモジュール初期化時（DI 前）に登録される必要があるため、自動抽出はできません。
- **コード内での環境変数名の使用** — プロパティ名は環境変数名と一致します（例：`config.database.DB_HOST`）。キャメルケースのプロパティほど慣用的ではないかもしれません。

## Docker 設計

Docker 構成は**単一のパラメータ化された Dockerfile** と**コンポーザブルな Docker Compose 構造**を使用し、マイクロサービスの数に応じてスケールします。

### Dockerfile

`APP_NAME` でパラメータ化された2ステージのマルチステージビルド：

| ステージ | 目的 |
| --- | --- |
| **development** | すべての依存関係をインストールし、ソースをコピーして `pnpm -w exec nx build` を実行。compose と組み合わせてホットリロード開発に使用。 |
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

- **`docker/base.yml`** — `${APP_NAME}` 変数補間を使用した再利用可能なサービステンプレートを定義します。ビルドコンテキスト、ビルド引数、コンテナ命名、開発コマンド（`pnpm -w run serve`）、環境変数、ソースボリュームマウント（ホットリロード対応）を処理します。
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

`apps/<app-name>/` ディレクトリにソースファイルと `tsconfig.app.json` が作成され、`nest-cli.json` にプロジェクトが登録されます。次に、新しいワークスペースパッケージの依存関係をインストールします：

```bash
pnpm install
```

### 2. Nx プロジェクト設定を作成

`apps/auth/project.json` のパターンに従って `apps/<app-name>/project.json` を作成：

```json
{
  "name": "<app-name>",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/<app-name>/src",
  "projectType": "application",
  "tags": ["scope:<app-name>", "type:app"],
  "targets": { }
}
```

`apps/auth/jest.config.ts` のパターンに従って `apps/<app-name>/jest.config.ts` を作成。

`eslint.config.mjs` に `scope:<app-name>` の依存制約を追加。

### 3. Docker 設定を作成

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

### 4. Docker Compose に登録

`docker-compose.yml` に追加：

```yaml
  - path: docker/<app-name>/compose.override.yml
    project_directory: .
    env_file: docker/<app-name>/.env.docker
```

### 5. ビルドと実行

```bash
make build && make up
make logs                # 新しいサービスを選択
```

## 開発

```bash
pnpm install                              # すべての依存関係をインストール
pnpm serve <app-name>                     # 開発サーバー（ウォッチモード）
pnpm serve <app-name> --configuration=debug  # デバッグモード
pnpm lint                                 # ESLint 全プロジェクト検査
pnpm format                               # Prettier フォーマット
pnpm test                                 # 全プロジェクトのユニットテスト
pnpm test:cov                             # テストカバレッジ
pnpm test:e2e                             # 全アプリの E2E テスト
pnpm graph                                # 依存関係グラフを開く
pnpm affected -t test                     # 影響を受けたプロジェクトのみテスト
```
