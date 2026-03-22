# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 monorepo using TypeScript, Express platform, pnpm workspaces, and Nx for task orchestration/caching. Multiple apps share common libraries to compare different library implementations (logging, error handling, config, etc.).

### Libraries (`libs/`)

- **common** (`@app/common`) — Shared utilities and modules used across apps
  - `libs/common/src/index.ts` — Public API barrel file
  - `libs/common/src/common.module.ts` + `common.service.ts` — Shared module/service
  - `libs/common/project.json` — Nx project config and targets

#### Config Module (`libs/common/src/config/`)

- `config.module.ts` — `AppConfigModule.forRoot({ namespaces })` wraps `@nestjs/config` with Zod validation, always loads base `appConfig` (NODE_ENV, SERVICE_NAME).
- `factories/namespaced-config.factory.ts` — `createNamespacedConfig({ key, schema, map })` creates a validated, namespace-scoped config factory (exposes `.KEY` injection token for `@Inject()`)
- `schemas/base.schema.ts` — Base `appConfig` factory + `AppConfig` type
- `types/config.type.ts` — `NamespaceFactory`, `AppConfigOptions` types

Apps encapsulate config in a `{PascalName}ConfigModule` that wraps `AppConfigModule.forRoot()` and provides a `{PascalName}ConfigService`. The app root module simply imports this config module. See `apps/auth/src/config/` for reference and `.claude/rules/config.md` for detailed patterns.

#### Logger Module (`libs/common/src/logger/`)

- `logger.module.ts` — `AppLoggerModule.forRoot()` / `forRootAsync()` wraps `nestjs-pino`. Global module — `AppLogger` is injectable everywhere.
- `logger.service.ts` — `AppLogger` implements NestJS `LoggerService`, delegates to Pino
- `logger.constants.ts` — `LOG_LEVELS`, `DEFAULT_LOG_LEVEL`, `DEFAULT_LOG_RETENTION_DAYS`, `DEFAULT_REDACT_PATHS`
- `types/logger.type.ts` — `LogLevel`, `AppLoggerOptions`, `AppLoggerAsyncOptions`

The logger reads `process.env` directly (not via ConfigModule) so it's available before config validation runs. See `.claude/rules/logger.md` for detailed patterns.

#### Exception Module (`libs/common/src/exception/`)

- `exception.registry.ts` — `ERROR_SOURCE` (A/B/C) and `ERROR_DOMAINS` (centralized domain number registry)
- `exception.constants.ts` — `COMMON_ERRORS` (shared error codes for domain `00`), `HTTP_STATUS_TO_ERROR` mapping
- `factories/error-codes.factory.ts` — `defineErrorCodes({ domain }, defs)` validates and auto-composes error codes (`source + domain + seq.padStart(3, '0')`)
- `exceptions/base.exception.ts` — `AppException` extends `HttpException` with `errorCode`, `userMessage`, `devMessage`, `%s` interpolation
- `exception.handler.ts` — `ExceptionHandler` (injectable service): `resolve(exception)` maps any exception to `ResolvedError` (5 cases: AppException → HttpException → RpcException → GraphQLError → unknown), `log()` writes warn/error based on source. Transport-agnostic.
- `filters/app-exception.filter.ts` — `AppExceptionFilter` auto-detects transport via `host.getType()`: HTTP → JSON response, RPC → `throwError()` observable, GraphQL → re-throws as `HttpException` with extensions
- `exception.module.ts` — `AppExceptionModule` registers `ExceptionHandler` (exported) and `AppExceptionFilter` (via `APP_FILTER`)
- `types/exception.type.ts` — `ErrorSource`, `ErrorCodeDef`, `ResolvedError`, `ErrorResponseBody` types

Apps define error codes in `apps/{name}/src/errors.ts` using `defineErrorCodes({ domain: ERROR_DOMAINS.{NAME} }, { ... })`. See `apps/auth/src/errors.ts` for reference and `.claude/rules/exception.md` for detailed patterns.

#### Interceptor Module (`libs/common/src/interceptor/`)

- `response/response.interceptor.ts` — `ResponseInterceptor` auto-detects transport via `context.getType()`: HTTP/RPC → wraps in `{ success: true, data, timestamp, traceId }`, GraphQL → pass-through (engine manages `{ data, errors }` format). RPC traceId extracted from gRPC metadata.
- `interceptor.module.ts` — `AppInterceptorModule` registers `ResponseInterceptor` (via `APP_INTERCEPTOR`)

The interceptor pairs with the exception filter for symmetric responses: success → `{ success: true, data }`, error → `{ success: false, code, message }`. See `.claude/rules/interceptor.md` for detailed patterns.

#### Middleware Module (`libs/common/src/middleware/`)

- `request-id/request-id.middleware.ts` — `RequestIdMiddleware` sets `req.id` from the `x-request-id` header (or generates a UUID) and echoes it in the `X-Request-Id` response header. Decouples request tracing from logging.
- `middleware.module.ts` — `AppMiddlewareModule` applies `RequestIdMiddleware` to all routes via `MiddlewareConsumer`

Import `AppMiddlewareModule` **before** `AppLoggerModule` so `req.id` is set before pino-http reads it. See `.claude/rules/middleware.md` for detailed patterns.

#### Database Module (`libs/common/src/database/`)

- `database.module.ts` — `AppDatabaseModule.forRoot()` / `forRootAsync()` wraps Drizzle ORM with `node-postgres`. Global module — `@InjectDrizzle()` works everywhere.
- `database.constants.ts` — `DRIZZLE` injection token (Symbol)
- `database.decorator.ts` — `@InjectDrizzle()` parameter decorator
- `repository/base.repository.ts` — `BaseRepository<TTable>` abstract class with generic CRUD: `findAll`, `findOne`, `findById`, `create`, `createMany`, `update`, `updateById`, `delete`, `deleteById`. All mutating methods use `.returning()`. Supports `withTransaction(tx)` to create a transactional clone.
- `transaction/transaction.manager.ts` — `TransactionManager` injectable service: `run(callback)` for simple auto-commit/rollback, `begin()` for manual control with `ManagedTransaction` (commit/rollback are idempotent).
- `transaction/with-transaction.util.ts` — `withTransaction(tx.db, ...repos)` creates transactional clones of multiple repositories in one call.
- `types/database.type.ts` — `DrizzleDB`, `AppDatabaseOptions`, `AppDatabaseAsyncOptions` types

#### Email Client Module (`libs/common/src/email-client/`)

- `email-client.module.ts` — `EmailClientModule.forRoot()` / `forRootAsync()` wraps gRPC client for the email microservice
- `email-client.service.ts` — `EmailClientService` with convenience methods: `sendVerificationCode()`, `sendPasswordReset()`, `sendWelcome()`
- `constants.ts` — `EMAIL_SERVICE_TOKEN`, `EMAIL_PACKAGE_NAME`
- `interfaces/email-service.interface.ts` — Re-exports types from `@proto/email` (generated by ts-proto)
- `types/email-client.type.ts` — `EmailClientOptions`, `EmailClientAsyncOptions`

Any app can send emails by importing `EmailClientModule` and injecting `EmailClientService`. The proto path is resolved internally via `process.cwd()` — consumers only provide `{ url }`. See `.claude/rules/email.md` for detailed patterns.

### Proto / gRPC Codegen (`proto/`)

- `proto/email.proto` — gRPC service definition for the email microservice
- `proto/generated/email.ts` — TypeScript types generated by `ts-proto` (committed to git). Re-run `pnpm proto:generate` after modifying `.proto` files.
- Path alias `@proto/*` maps to `proto/generated/*` in `tsconfig.json`
- `ts-proto` options: `nestJs=true` (generates `@EmailServiceControllerMethods()` decorator + `EmailServiceController` interface), `outputServices=grpc-js`, `snakeToCamel=true`
- Generated files are committed to avoid requiring `protoc` in CI

Schema files live in app-level domain `schemas/` subdirectories (e.g., `apps/auth/src/users/schemas/user.schema.ts`), not in the common lib. Each app has a barrel file (`apps/{name}/src/schemas.ts`) that re-exports all schemas for drizzle-kit. Each domain gets its own module encapsulating the repository. See `apps/auth/src/users/` for reference and `.claude/rules/database.md` for detailed patterns.

#### Migration (`docker/migrate-with-lock.mjs`)

- `docker/migrate-with-lock.mjs` — Node.js script that wraps `drizzle-kit migrate` with PostgreSQL advisory lock, auto-creates the app database if it doesn't exist, and retries connections until PostgreSQL is ready.
- `docker/entrypoint.sh` — Container entrypoint that calls `migrate-with-lock.mjs` before starting the application.
- `apps/{name}/drizzle/` — Generated migration SQL files and `meta/` snapshots (must be committed to git).
- `apps/{name}/drizzle.config.ts` — Per-app drizzle-kit configuration.
- `apps/{name}/src/schemas.ts` — Barrel file re-exporting all Drizzle schemas for drizzle-kit to read.

Migrations use a forward-only strategy (no rollback). See `.claude/rules/migration.md` for detailed patterns.

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

- `Dockerfile` — 2-stage multi-stage build (development → production). `ENV APP_NAME` is set from the build ARG so the entrypoint can reference it at runtime.
- `docker-compose.yml` — Modular compose using `include` for per-app overrides and shared storage (postgres)
- `docker/base.yml` — Shared service definition (build context, dev command, volume mounts)
- `docker/<app>/compose.override.yml` — Per-app service extending base with port mappings
- `docker/storage/postgres.yml` — PostgreSQL service
- `docker/entrypoint.sh` — Container entrypoint: runs migration script (if drizzle config exists) then `exec "$@"`
- `docker/migrate-with-lock.mjs` — Migration runner with advisory lock, auto database creation, and connection retry
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
- Path aliases: `@app/common` → `libs/common/src`, `@email/*` → `apps/email/src/*`, `@proto/*` → `proto/generated/*`
- Per-app build configs exclude `node_modules`, `dist`, `test`, and `*.spec.ts` files
