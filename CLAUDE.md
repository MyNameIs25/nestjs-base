# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 monorepo using TypeScript, Express platform, pnpm workspaces, and Nx for task orchestration/caching. Multiple apps share common libraries to compare different library implementations (logging, error handling, config, etc.).

## Commands

```bash
pnpm install                              # Install dependencies (all workspaces)
pnpm build                                # Build all projects (cached)
pnpm serve auth                           # Dev server (auth) with watch mode
pnpm serve auth --configuration=debug     # Debug server (auth) with watch mode
pnpm lint                                 # ESLint all projects
pnpm format                               # Prettier format apps/ and libs/
pnpm test                                 # Unit tests (Jest, files matching *.spec.ts)
pnpm test:cov                             # Unit tests with coverage report
pnpm test:e2e                             # E2E tests (all apps)
pnpm graph                                # Open interactive dependency graph
pnpm affected -t build                    # Build only affected projects
pnpm affected -t test                     # Test only affected projects
```

#### Module Boundary Tags

Projects are tagged for dependency enforcement via `@nx/enforce-module-boundaries`:

| Tag | Projects | Can depend on |
|-----|----------|---------------|
| `scope:auth` | auth | `scope:shared`, `scope:auth` |
| `scope:payments` | payments | `scope:shared`, `scope:payments` |
| `scope:shared` | common | — |
| `type:app` | auth, payments | `type:lib` |
| `type:lib` | common | — |

When adding a new app, add a `scope:<name>` depConstraint in `eslint.config.mjs`.

### Docker Commands

```bash
make build                          # Build dev Docker image
make up                             # Start dev container (hot reload)
make down                           # Stop dev container
make logs                           # Tail dev container logs
docker build --target production .  # Build production image
```

### CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes to `main` and PRs:
- Format check (Prettier)
- Lint, build, unit tests, E2E tests (via `nx affected`)

## Architecture

NestJS monorepo (`nest-cli.json` with `monorepo: true`) using pnpm workspaces for dependency isolation and Nx for build orchestration, caching, and module boundary enforcement.

### Apps (`apps/`)

- **auth** (default) — Auth-focused app for comparing auth library implementations
  - `apps/auth/src/main.ts` — Bootstrap entry point
  - `apps/auth/src/auth.module.ts` — Root module
  - `apps/auth/src/auth.controller.ts` + `auth.service.ts` — Default controller/service pair
  - `apps/auth/test/` — E2E tests
  - `apps/auth/package.json` — App-level runtime dependencies
  - `apps/auth/project.json` — Nx project config and targets
- **payments** — Payments service (port 3001)
  - `apps/payments/src/main.ts` — Bootstrap entry point
  - `apps/payments/src/payments.module.ts` — Root module
  - `apps/payments/src/payments.controller.ts` + `payments.service.ts` — Default controller/service pair
  - `apps/payments/test/` — E2E tests
  - `apps/payments/package.json` — App-level runtime dependencies
  - `apps/payments/project.json` — Nx project config and targets

### Libraries (`libs/`)

- **common** (`@app/common`) — Shared utilities and modules used across apps
  - `libs/common/src/index.ts` — Public API barrel file
  - `libs/common/src/common.module.ts` + `common.service.ts` — Shared module/service
  - `libs/common/project.json` — Nx project config and targets

### Configuration

- `nx.json` — Nx workspace config (caching, task pipeline, named inputs)
- `nest-cli.json` — Monorepo project definitions (default: auth)
- `tsconfig.json` — Root TypeScript config with `@app/common` path aliases
- `apps/*/tsconfig.app.json` — Per-app build configs
- `libs/*/tsconfig.lib.json` — Per-library build configs
- `apps/*/project.json` — Per-app Nx project configs
- `libs/*/project.json` — Per-library Nx project configs
- `jest.preset.js` — Shared Jest preset (Nx + project settings)
- `pnpm-workspace.yaml` — Workspace definitions (`apps/*`, `libs/*`)
- `package.json` — Root with `packageManager: pnpm@10.26.1`, devDeps, and shared tooling

### Docker

- `Dockerfile` — 2-stage multi-stage build (development → production)
- `docker-compose.yml` — Modular compose using `include` for per-app overrides and shared storage (postgres)
- `docker/base.yml` — Shared service definition (build context, dev command, volume mounts)
- `docker/<app>/compose.override.yml` — Per-app service extending base with port mappings
- `docker/storage/postgres.yml` — PostgreSQL service
- `.dockerignore` — Excludes node_modules, dist, .git, .nx, etc.
- `Makefile` — Convenience targets for Docker commands

Unit tests live alongside source files as `*.spec.ts`. E2E tests live in each app's `test/` directory as `*.e2e-spec.ts`.

## Git Hooks

Pre-commit hook (via husky + lint-staged) runs `eslint --fix` and `prettier --write` on all staged `*.ts` files. Skip with `git commit --no-verify` if needed.

## Code Style

- **Prettier**: single quotes, trailing commas (`all`), auto end-of-line
- **ESLint**: flat config (`eslint.config.mjs`) with `typescript-eslint` type-checked rules, prettier integration, and `@nx/enforce-module-boundaries`
- `@typescript-eslint/no-explicit-any` is disabled
- `no-floating-promises` and `no-unsafe-argument` are warnings (not errors)

## TypeScript Configuration

- Module system: `commonjs` (module), `node` (moduleResolution)
- Target: `ES2023`
- `strictNullChecks` enabled, `noImplicitAny` enabled
- Decorators: `emitDecoratorMetadata` + `experimentalDecorators` enabled
- Path aliases: `@app/common` → `libs/common/src`
- Per-app build configs exclude `node_modules`, `dist`, `test`, and `*.spec.ts` files
