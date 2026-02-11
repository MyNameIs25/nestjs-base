<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

[![CI](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml/badge.svg)](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml)

# NestJS Monorepo

使用 **Nx** 进行构建编排，从 **2/setup-nx-for-monorepo** 派生的 NestJS monorepo 项目。
新增**配置模块**（`@app/common`），对 `@nestjs/config` 进行封装，提供 Zod 校验和命名空间化的配置工厂。

## 项目结构

```text
├── apps/
│   ├── auth/                       # Auth 微服务（默认，端口 3000）
│   │   ├── src/
│   │   │   ├── main.ts             # 启动入口
│   │   │   ├── auth.module.ts      # 根模块
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── test/                   # E2E 测试
│   │   ├── package.json            # 应用级依赖
│   │   ├── project.json            # Nx 项目配置
│   │   ├── jest.config.ts          # 项目级 Jest 配置
│   │   └── tsconfig.app.json
│   └── payments/                   # Payments 微服务（端口 3001）
├── libs/
│   └── common/                     # 共享库 (@app/common)
│       ├── src/
│       │   ├── index.ts            # 公共 API 导出文件
│       │   ├── common.module.ts
│       │   └── common.service.ts
│       ├── project.json            # Nx 项目配置
│       ├── jest.config.ts          # 项目级 Jest 配置
│       └── tsconfig.lib.json
├── docker/
│   ├── base.yml                    # 共享 Docker Compose 服务模板
│   ├── auth/
│   │   ├── compose.override.yml    # Auth 专属 compose 覆盖配置
│   │   └── .env.docker             # APP_NAME=auth
│   └── payments/
│       ├── compose.override.yml    # Payments 专属 compose 覆盖配置
│       └── .env.docker             # APP_NAME=payments
├── docker-compose.yml              # 引入各应用的 compose 文件
├── Dockerfile                      # 多阶段构建（development + production）
├── Makefile                        # Docker 便捷命令
├── nx.json                         # Nx 工作区配置（缓存、流水线）
├── jest.preset.js                  # 共享 Jest 预设
├── nest-cli.json                   # Monorepo 项目定义
├── pnpm-workspace.yaml             # 工作区定义
└── tsconfig.json                   # 根 TS 配置及路径别名
```

## Monorepo 设计

本项目使用 **NestJS monorepo** 配合 **pnpm workspaces** 进行依赖管理，并使用 **Nx** 进行构建编排、计算缓存和模块边界检查。

### 工作原理

- **`nest-cli.json`** 以 `"monorepo": true` 注册所有应用和库。NestJS CLI 据此为正确的项目执行构建、启动和代码生成。
- **`pnpm-workspace.yaml`** 将 `apps/*` 声明为工作区包，为每个应用提供独立的 `package.json` 以实现依赖隔离。
- **`tsconfig.json`** 定义路径别名（例如 `@app/common`），使任何应用都可以通过别名导入共享库，而无需使用相对路径。
- **Nx** 编排构建、测试和代码检查，提供计算缓存和 `affected` 命令。每个项目都有一个 `project.json` 定义其目标和标签。
- 每个应用拥有自己的 `main.ts` 入口、根模块和构建配置，可以独立构建和部署。
- 库（`libs/`）包含通过路径别名引用的共享代码，在构建时打包到各应用中——它们不会作为独立包发布。

### 优点

- **共享代码无重复** — 公共工具、模块和类型存放在 `libs/` 中，任何应用都可通过 `@app/common` 导入。
- **原子变更** — 单次提交即可同时更新共享库和所有使用它的应用，避免版本偏移。
- **统一工具链** — 整个代码库共享一套 ESLint、Prettier、TypeScript 和 Jest 配置。
- **简洁的依赖管理** — pnpm workspaces 提升共享依赖，减少磁盘使用和安装时间。
- **独立部署** — 每个应用构建到各自的 `dist/`，可以单独部署。

### 缺点

- **构建耦合** — 修改共享库需要重新构建所有依赖它的应用。Nx `affected` 命令通过仅重新构建变更的部分来缓解这一问题。
- **扩展性限制** — 随着应用数量增长，安装和构建时间也会增加。Nx 计算缓存和任务图编排通过跳过未变更的工作来解决这个问题。
- **共享依赖版本** — 所有应用共享根级依赖的同一版本。升级某个包（例如 NestJS）会同时影响所有应用。
- **IDE 性能** — 包含大量项目的大型 monorepo 可能会拖慢 TypeScript 语言服务和文件索引。

## 配置模块设计

配置模块（`libs/common/src/config/`）对 `@nestjs/config` 进行封装，提供 **Zod 校验**和**命名空间工厂模式**，使每个配置命名空间在启动时完成校验，并通过 NestJS DI 注入。

### 工作原理

- **`createNamespacedConfig({ key, schema, map })`** 创建一个配置工厂，在启动时使用 Zod schema 校验 `process.env`。返回带有 `.KEY` 注入令牌的工厂，用于 `@Inject()`。`map` 参数将环境变量重命名为更友好的属性名（例如 `DB_HOST` → `host`）。
- **`AppConfigModule.forRoot({ namespaces })`** 封装 `ConfigModule.forRoot()`。始终加载基础 `appConfig`（NODE_ENV, SERVICE_NAME），并合并通过 `namespaces[]` 传入的额外命名空间工厂。设置 `isGlobal: true` 和 `cache: true`。
- **应用级配置服务**（例如 `AuthConfigService`）使用 `@Inject(factory.KEY)` 在构造函数中接收经过校验和映射的配置对象。它们作为普通 provider 注册在应用模块中。

### 流程

```text
.env → Zod schema 校验 process.env → map 重命名键 → @Inject(factory.KEY) 注入配置
```

### 示例

Schema 文件（`apps/auth/src/config/schemas/database.config.ts`）：

```typescript
const databaseSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
});

export const databaseConfig = createNamespacedConfig({
  key: 'database',
  schema: databaseSchema,
  map: { host: 'DB_HOST', port: 'DB_PORT', name: 'DB_NAME' },
});
```

配置服务（`apps/auth/src/config/config.service.ts`）：

```typescript
@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(appConfig.KEY) readonly app: AppConfig,
    @Inject(databaseConfig.KEY) readonly database: DatabaseConfig,
  ) {}
}
```

应用模块注册命名空间并将配置服务作为 provider：

```typescript
@Module({
  imports: [AppConfigModule.forRoot({ namespaces: [databaseConfig] })],
  providers: [AuthConfigService, AuthService],
})
export class AuthModule {}
```

### 优点

- **启动时快速失败** — 无效或缺失的环境变量在启动时抛出带命名空间名称的清晰错误信息，而非在运行时静默失败。
- **类型安全配置** — `ConfigType<typeof factory>` 推断出精确的类型结构，`config.database.host` 被推断为 `string`，无需手动编写接口。
- **简洁的 DI** — `@Inject(factory.KEY)` 使用 NestJS 原生 DI，无需封装类或抽象基类。
- **环境变量重命名** — `map` 参数将属性名与环境变量名解耦（`DB_HOST` → `host`），保持应用代码整洁。
- **命名空间隔离** — 每个命名空间独立校验和注入，添加新命名空间不影响现有命名空间。

### 缺点

- **间接层** — `createNamespacedConfig` 在 `@nestjs/config` 的 `registerAs` 之上增加了抽象层。开发者需要同时理解封装层和底层库。
- **双重注册** — 命名空间需要同时在模块的 `forRoot({ namespaces })` 和配置服务的 `@Inject()` 中声明。由于配置工厂必须在模块初始化阶段（DI 之前）注册，因此无法自动提取。
- **映射样板代码** — 每个命名空间都需要定义 schema、map 和类型导出。对于简单配置，这比直接使用 `ConfigService.get()` 更繁琐。

## Docker 设计

Docker 配置使用**单一参数化 Dockerfile** 和**可组合的 Docker Compose 结构**，随微服务数量灵活扩展。

### Dockerfile

由 `APP_NAME` 参数化的两阶段多阶段构建：

| 阶段 | 用途 |
| --- | --- |
| **development** | 安装所有依赖，复制源码，运行 `pnpm -w exec nx build`。配合 compose 用于热重载开发。 |
| **production** | 仅安装生产依赖，从 development 阶段复制构建产物 `dist/`。运行 `node dist/apps/<APP_NAME>/main`。 |

同一 Dockerfile 可构建任何应用——只需传递不同的 `APP_NAME` 构建参数。

### Docker Compose

Compose 配置将共享配置与各应用的覆盖配置分离：

```text
docker-compose.yml              ← 引入各应用的 compose 文件
docker/
  base.yml                      ← 共享服务模板（构建、环境、卷、命令）
  auth/
    compose.override.yml        ← 应用专属覆盖（服务名、端口）
    .env.docker                 ← APP_NAME=auth
```

- **`docker/base.yml`** — 定义可复用的服务模板，使用 `${APP_NAME}` 变量插值。处理构建上下文、构建参数、容器命名、开发命令（`pnpm -w run serve`）、环境变量和源码卷挂载（支持热重载）。
- **`docker/<app>/compose.override.yml`** — 仅包含每个应用的独特配置：服务名和端口映射。其余通过 `extends` 继承。
- **`docker-compose.yml`** — 使用 `include` 引入各应用的 compose 文件，通过 `project_directory: .` 从项目根目录解析路径，通过 `env_file` 注入 `APP_NAME` 变量。

### Makefile

| 命令 | 说明 |
| --- | --- |
| `make build` | 构建所有 Docker 镜像 |
| `make up` | 以后台模式启动所有容器 |
| `make down` | 停止并移除所有容器 |
| `make logs` | 交互式服务选择器——列出运行中的容器并追踪所选服务的日志 |

## 添加新的微服务

### 1. 生成 NestJS 应用

```bash
nest generate app <app-name>
```

这会创建 `apps/<app-name>/` 目录及源文件、`tsconfig.app.json`，并在 `nest-cli.json` 中注册该项目。然后安装新工作区包的依赖：

```bash
pnpm install
```

### 2. 创建 Nx 项目配置

创建 `apps/<app-name>/project.json`，参照 `apps/auth/project.json` 的模式：

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

创建 `apps/<app-name>/jest.config.ts`，参照 `apps/auth/jest.config.ts` 的模式。

在 `eslint.config.mjs` 中添加 `scope:<app-name>` 依赖约束。

### 3. 创建 Docker 配置

```bash
mkdir docker/<app-name>
```

创建 `docker/<app-name>/.env.docker`：

```text
APP_NAME=<app-name>
```

创建 `docker/<app-name>/compose.override.yml`：

```yaml
services:
  <app-name>:
    extends:
      file: docker/base.yml
      service: app
    ports:
      - '<port>:<port>'
```

### 4. 注册到 Docker Compose

在 `docker-compose.yml` 中添加：

```yaml
  - path: docker/<app-name>/compose.override.yml
    project_directory: .
    env_file: docker/<app-name>/.env.docker
```

### 5. 构建并运行

```bash
make build && make up
make logs                # 选择你的新服务
```

## 开发

```bash
pnpm install                              # 安装所有依赖
pnpm serve <app-name>                     # 开发服务器（热重载模式）
pnpm serve <app-name> --configuration=debug  # 调试模式
pnpm lint                                 # ESLint 检查所有项目
pnpm format                               # Prettier 格式化
pnpm test                                 # 所有项目的单元测试
pnpm test:cov                             # 测试覆盖率
pnpm test:e2e                             # 所有应用的 E2E 测试
pnpm graph                                # 打开依赖关系图
pnpm affected -t test                     # 仅测试受影响的项目
```
