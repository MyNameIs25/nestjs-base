<p align="center">
  <a href="README.md">English</a> |
  <a href="docs/README.zh-CN.md">简体中文</a> |
  <a href="docs/README.ja.md">日本語</a>
</p>

[![CI](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml/badge.svg)](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml)

# NestJS Monorepo

NestJS monorepo setup with **Nx** for build orchestration, branched out from **1/monorepo-setup**.
Multiple apps share common libraries for comparing different library
implementations (logging, error handling, config, etc.).

## Project Structure

```text
├── apps/
│   ├── auth/                       # Auth microservice (default, port 3000)
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap entry point
│   │   │   ├── auth.module.ts      # Root module
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── test/                   # E2E tests
│   │   ├── package.json            # App-level dependencies
│   │   ├── project.json            # Nx project config
│   │   ├── jest.config.ts          # Per-project Jest config
│   │   └── tsconfig.app.json
│   └── payments/                   # Payments microservice (port 3001)
├── libs/
│   └── common/                     # Shared library (@app/common)
│       ├── src/
│       │   ├── index.ts            # Public API barrel file
│       │   ├── common.module.ts
│       │   └── common.service.ts
│       ├── project.json            # Nx project config
│       ├── jest.config.ts          # Per-project Jest config
│       └── tsconfig.lib.json
├── docker/
│   ├── base.yml                    # Shared Docker Compose service template
│   ├── auth/
│   │   ├── compose.override.yml    # Auth-specific compose overrides
│   │   └── .env.docker             # APP_NAME=auth
│   └── payments/
│       ├── compose.override.yml    # Payments-specific compose overrides
│       └── .env.docker             # APP_NAME=payments
├── docker-compose.yml              # Includes per-app compose files
├── Dockerfile                      # Multi-stage build (development + production)
├── Makefile                        # Docker convenience commands
├── nx.json                         # Nx workspace config (caching, pipelines)
├── jest.preset.js                  # Shared Jest preset
├── nest-cli.json                   # Monorepo project definitions
├── pnpm-workspace.yaml             # Workspace definitions
└── tsconfig.json                   # Root TS config with path aliases
```

## Monorepo Design

This project uses a **NestJS monorepo** with **pnpm workspaces** for dependency management and **Nx** for build orchestration, computation caching, and module boundary enforcement.

### How It Works

- **`nest-cli.json`** registers all apps and libraries with `"monorepo": true`. The NestJS CLI uses this to build, serve, and generate code for the correct project.
- **`pnpm-workspace.yaml`** declares `apps/*` as workspace packages, giving each app its own `package.json` for dependency isolation.
- **`tsconfig.json`** defines path aliases (e.g., `@app/common`) so any app can import shared libraries without relative paths.
- **Nx** orchestrates builds, tests, and linting with computation caching and `affected` commands. Each project has a `project.json` defining its targets and tags.
- Each app has its own `main.ts` entry point, root module, and build config. Apps are independently buildable and deployable.
- Libraries (`libs/`) contain shared code referenced via path aliases and bundled into each app at build time — they are not published as separate packages.

### Pros

- **Shared code without duplication** — Common utilities, modules, and types live in `libs/` and are imported by any app via `@app/common`.
- **Atomic changes** — A single commit can update a shared library and all apps that use it, avoiding version drift.
- **Unified tooling** — One set of ESLint, Prettier, TypeScript, and Jest configs for the entire codebase.
- **Simple dependency management** — pnpm workspaces hoist shared dependencies, reducing disk usage and install time.
- **Independent deployability** — Each app builds to its own `dist/` and can be deployed separately.

### Cons

- **Build coupling** — Changing a shared library requires rebuilding every app that depends on it. Nx `affected` commands mitigate this by only rebuilding what changed.
- **Scaling limits** — As the number of apps grows, install and build times increase. Nx computation caching and task graph orchestration address this by skipping unchanged work.
- **Shared dependency versions** — All apps share the same version of root-level dependencies. Upgrading a package (e.g., NestJS) affects everything at once.
- **IDE performance** — Large monorepos with many projects can slow down TypeScript language server and file indexing.

## Docker Design

The Docker setup uses a **single parameterized Dockerfile** and a **composable Docker Compose structure** that scales with the number of microservices.

### Dockerfile

A 2-stage multi-stage build parameterized by `APP_NAME`:

| Stage | Purpose |
| --- | --- |
| **development** | Installs all deps, copies source, runs `pnpm -w exec nx build`. Used with compose for dev with hot reload. |
| **production** | Installs prod deps only, copies built `dist/` from development stage. Runs `node dist/apps/<APP_NAME>/main`. |

The same Dockerfile builds any app — just pass a different `APP_NAME` build arg.

### Docker Compose

The compose setup separates shared configuration from per-app overrides:

```text
docker-compose.yml              ← includes per-app compose files
docker/
  base.yml                      ← shared service template (build, env, volumes, command)
  auth/
    compose.override.yml        ← app-specific overrides (service name, port)
    .env.docker                 ← APP_NAME=auth
```

- **`docker/base.yml`** — Defines a reusable service template with `${APP_NAME}` interpolation. Handles build context, build args, container naming, the dev command (`pnpm -w run serve`), environment variables, and source volume mounts for hot reload.
- **`docker/<app>/compose.override.yml`** — Only contains what's unique to each app: the service name and port mapping. Everything else is inherited via `extends`.
- **`docker-compose.yml`** — Uses `include` to pull in each app's compose file, with `project_directory: .` for path resolution from the project root and `env_file` to inject the `APP_NAME` variable.

### Makefile

| Command | Description |
| --- | --- |
| `make build` | Build all Docker images |
| `make up` | Start all containers in detached mode |
| `make down` | Stop and remove all containers |
| `make logs` | Interactive service selector — lists running containers and tails logs for your selection |

## Adding a New Microservice

### 1. Generate the NestJS app

```bash
nest generate app <app-name>
```

This creates `apps/<app-name>/` with source files, `tsconfig.app.json`, and registers the project in `nest-cli.json`. Then install dependencies for the new workspace package:

```bash
pnpm install
```

### 2. Create Nx project config

Create `apps/<app-name>/project.json` following the same pattern as `apps/auth/project.json`:

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

Create `apps/<app-name>/jest.config.ts` following the same pattern as `apps/auth/jest.config.ts`.

Add a `scope:<app-name>` depConstraint in `eslint.config.mjs`.

### 3. Create the Docker config

```bash
mkdir docker/<app-name>
```

Create `docker/<app-name>/.env.docker`:

```text
APP_NAME=<app-name>
```

Create `docker/<app-name>/compose.override.yml`:

```yaml
services:
  <app-name>:
    extends:
      file: docker/base.yml
      service: app
    ports:
      - '<port>:<port>'
```

### 4. Register in Docker Compose

Add to `docker-compose.yml`:

```yaml
  - path: docker/<app-name>/compose.override.yml
    project_directory: .
    env_file: docker/<app-name>/.env.docker
```

### 5. Build and run

```bash
make build && make up
make logs                # select your new service
```

## Development

```bash
pnpm install                              # Install all dependencies
pnpm serve <app-name>                     # Dev server with watch mode
pnpm serve <app-name> --configuration=debug  # Debug mode
pnpm lint                                 # ESLint all projects
pnpm format                               # Prettier
pnpm test                                 # Unit tests (all projects)
pnpm test:cov                             # Test coverage
pnpm test:e2e                             # E2E tests (all apps)
pnpm graph                                # Open dependency graph
pnpm affected -t test                     # Test only affected projects
```
