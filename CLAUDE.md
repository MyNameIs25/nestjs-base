# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 monorepo using TypeScript, Express platform, pnpm workspaces. Multiple apps share common libraries to compare different library implementations (logging, error handling, config, etc.).

## Commands

```bash
pnpm install                        # Install dependencies (all workspaces)
nest build auth                     # Build auth app
nest build common                   # Build common library
nest start --watch                  # Dev server (default app) with watch mode
nest start auth --watch             # Dev server (auth) with watch mode
nest start auth --debug --watch     # Debug server (auth) with watch mode
pnpm run start:prod                 # Production (node dist/apps/<app>/main)
pnpm run lint                       # ESLint with auto-fix
pnpm run format                     # Prettier format apps/ and libs/
pnpm run test                       # Unit tests (Jest, files matching *.spec.ts)
npx jest --testPathPatterns='auth.controller' # Run a single test file
npx jest --config apps/auth/test/jest-e2e.json  # E2E tests (auth)
pnpm run test:cov                   # Unit tests with coverage report
```

### Docker Commands

```bash
make build                          # Build dev Docker image
make up                             # Start dev container (hot reload)
make down                           # Stop dev container
make logs                           # Tail dev container logs
docker build --target production .  # Build production image
```

## Architecture

NestJS monorepo (`nest-cli.json` with `monorepo: true`) using pnpm workspaces for dependency isolation.

### Apps (`apps/`)

- **auth** (default) — Auth-focused app for comparing auth library implementations
  - `apps/auth/src/main.ts` — Bootstrap entry point
  - `apps/auth/src/auth.module.ts` — Root module
  - `apps/auth/src/auth.controller.ts` + `auth.service.ts` — Default controller/service pair
  - `apps/auth/test/` — E2E tests
  - `apps/auth/package.json` — App-level runtime dependencies
- **payments** — Payments service (port 3001)
  - `apps/payments/src/main.ts` — Bootstrap entry point
  - `apps/payments/src/payments.module.ts` — Root module
  - `apps/payments/src/payments.controller.ts` + `payments.service.ts` — Default controller/service pair
  - `apps/payments/test/` — E2E tests
  - `apps/payments/package.json` — App-level runtime dependencies

### Libraries (`libs/`)

- **common** (`@app/common`) — Shared utilities and modules used across apps
  - `libs/common/src/index.ts` — Public API barrel file
  - `libs/common/src/common.module.ts` + `common.service.ts` — Shared module/service

### Configuration

- `nest-cli.json` — Monorepo project definitions (default: auth)
- `tsconfig.json` — Root TypeScript config with `@app/common` path aliases
- `apps/*/tsconfig.app.json` — Per-app build configs
- `libs/*/tsconfig.lib.json` — Per-library build configs
- `pnpm-workspace.yaml` — Workspace definitions (`apps/*`, `libs/*`)
- `package.json` — Root with `packageManager: pnpm@10.26.1`, devDeps, and shared tooling

### Docker

- `Dockerfile` — 2-stage multi-stage build (development → production)
- `docker-compose.yml` — Modular compose using `include` for per-app overrides and shared storage (postgres)
- `docker/base.yml` — Shared service definition (build context, dev command, volume mounts)
- `docker/<app>/compose.override.yml` — Per-app service extending base with port mappings
- `docker/storage/postgres.yml` — PostgreSQL service
- `.dockerignore` — Excludes node_modules, dist, .git, etc.
- `Makefile` — Convenience targets for Docker commands

Unit tests live alongside source files as `*.spec.ts`. E2E tests live in each app's `test/` directory as `*.e2e-spec.ts`.

## Git Hooks

Pre-commit hook (via husky + lint-staged) runs `eslint --fix` and `prettier --write` on all staged `*.ts` files. Skip with `git commit --no-verify` if needed.

## Code Style

- **Prettier**: single quotes, trailing commas (`all`), auto end-of-line
- **ESLint**: flat config (`eslint.config.mjs`) with `typescript-eslint` type-checked rules and prettier integration
- `@typescript-eslint/no-explicit-any` is disabled
- `no-floating-promises` and `no-unsafe-argument` are warnings (not errors)

## TypeScript Configuration

- Module system: `nodenext` (module + moduleResolution)
- Target: `ES2023`
- `strictNullChecks` enabled, `noImplicitAny` disabled
- Decorators: `emitDecoratorMetadata` + `experimentalDecorators` enabled
- Path aliases: `@app/common` → `libs/common/src`
- Per-app build configs exclude `node_modules`, `dist`, `test`, and `*.spec.ts` files
