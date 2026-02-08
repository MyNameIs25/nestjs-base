<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

# NestJS Monorepo

从 **0/initialization** 派生的 NestJS monorepo 项目。
多个应用共享公共库，用于比较不同库的实现方式（日志、错误处理、配置等）。

## 项目结构

```text
├── apps/
│   └── auth/                       # Auth 微服务
│       ├── src/
│       │   ├── main.ts             # 启动入口
│       │   ├── auth.module.ts      # 根模块
│       │   ├── auth.controller.ts
│       │   └── auth.service.ts
│       ├── test/                   # E2E 测试
│       ├── package.json            # 应用级依赖
│       └── tsconfig.app.json
├── libs/
│   └── common/                     # 共享库 (@app/common)
│       ├── src/
│       │   ├── index.ts            # 公共 API 导出文件
│       │   ├── common.module.ts
│       │   └── common.service.ts
│       └── tsconfig.lib.json
├── docker/
│   ├── base.yml                    # 共享 Docker Compose 服务模板
│   └── auth/
│       ├── compose.override.yml    # Auth 专属 compose 覆盖配置
│       └── .env.docker             # APP_NAME=auth
├── docker-compose.yml              # 引入各应用的 compose 文件
├── Dockerfile                      # 多阶段构建（development + production）
├── Makefile                        # Docker 便捷命令
├── nest-cli.json                   # Monorepo 项目定义
├── pnpm-workspace.yaml             # 工作区定义
└── tsconfig.json                   # 根 TS 配置及路径别名
```

## Monorepo 设计

本项目使用 **NestJS monorepo** 配合 **pnpm workspaces** 进行依赖管理。

### 工作原理

- **`nest-cli.json`** 以 `"monorepo": true` 注册所有应用和库。NestJS CLI 据此为正确的项目执行构建、启动和代码生成。
- **`pnpm-workspace.yaml`** 将 `apps/*` 声明为工作区包，为每个应用提供独立的 `package.json` 以实现依赖隔离。
- **`tsconfig.json`** 定义路径别名（例如 `@app/common`），使任何应用都可以通过别名导入共享库，而无需使用相对路径。
- 每个应用拥有自己的 `main.ts` 入口、根模块和构建配置，可以独立构建和部署。
- 库（`libs/`）包含通过路径别名引用的共享代码，在构建时打包到各应用中——它们不会作为独立包发布。

### 优点

- **共享代码无重复** — 公共工具、模块和类型存放在 `libs/` 中，任何应用都可通过 `@app/common` 导入。
- **原子变更** — 单次提交即可同时更新共享库和所有使用它的应用，避免版本偏移。
- **统一工具链** — 整个代码库共享一套 ESLint、Prettier、TypeScript 和 Jest 配置。
- **简洁的依赖管理** — pnpm workspaces 提升共享依赖，减少磁盘使用和安装时间。
- **独立部署** — 每个应用构建到各自的 `dist/`，可以单独部署。

### 缺点

- **构建耦合** — 修改共享库需要重新构建所有依赖它的应用。CI 流水线需要了解依赖关系图。
- **扩展性限制** — 随着应用数量增长，安装和构建时间也会增加。大型 monorepo 可能需要 Nx 或 Turborepo 等工具进行增量构建。
- **共享依赖版本** — 所有应用共享根级依赖的同一版本。升级某个包（例如 NestJS）会同时影响所有应用。
- **IDE 性能** — 包含大量项目的大型 monorepo 可能会拖慢 TypeScript 语言服务和文件索引。

## Docker 设计

Docker 配置使用**单一参数化 Dockerfile** 和**可组合的 Docker Compose 结构**，随微服务数量灵活扩展。

### Dockerfile

由 `APP_NAME` 参数化的两阶段多阶段构建：

| 阶段 | 用途 |
| --- | --- |
| **development** | 安装所有依赖，复制源码，运行 `pnpm run build`。配合 compose 用于热重载开发。 |
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

- **`docker/base.yml`** — 定义可复用的服务模板，使用 `${APP_NAME}` 变量插值。处理构建上下文、构建参数、容器命名、开发命令（`pnpm run start:dev`）、环境变量和源码卷挂载（支持热重载）。
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

这会创建 `apps/<app-name>/` 目录及源文件、`tsconfig.app.json`，并在 `nest-cli.json` 中注册该项目。

### 2. 创建 Docker 配置

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

### 3. 注册到 Docker Compose

在 `docker-compose.yml` 中添加：

```yaml
  - path: docker/<app-name>/compose.override.yml
    project_directory: .
    env_file: docker/<app-name>/.env.docker
```

### 4. 构建并运行

```bash
make build && make up
make logs                # 选择你的新服务
```

## 开发

```bash
pnpm install                        # 安装所有依赖
pnpm run start:dev                  # 开发服务器（auth）热重载模式
pnpm run start:dev <app-name>       # 指定应用的开发服务器
pnpm run lint                       # ESLint 自动修复
pnpm run format                     # Prettier 格式化
pnpm run test                       # 单元测试
pnpm run test:e2e                   # E2E 测试
pnpm run test:cov                   # 测试覆盖率
```
