<p align="center">
  <a href="README.md">English</a> |
  <a href="docs/README.zh-CN.md">简体中文</a> |
  <a href="docs/README.ja.md">日本語</a>
</p>

[![CI](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml/badge.svg)](https://github.com/MyNameIs25/nestjs-base/actions/workflows/ci.yml)

# NestJS Monorepo

NestJS monorepo with **Nx** for build orchestration, **pnpm workspaces** for dependency management, and shared libraries in `libs/common`. Each branch explores a different library integration (config, logging, error handling, etc.).

## Monorepo Design

- **`nest-cli.json`** registers apps/libraries with `"monorepo": true`
- **`pnpm-workspace.yaml`** gives each app its own `package.json` for dependency isolation
- **`tsconfig.json`** defines path aliases (`@app/common`) for shared imports
- **Nx** orchestrates builds/tests with computation caching and `affected` commands
- Libraries in `libs/` are bundled into each app at build time — not published separately

### Pros

- **Shared code** — Common modules live in `libs/` and are imported via `@app/common`
- **Atomic changes** — A single commit can update a shared library and all consuming apps
- **Unified tooling** — One set of ESLint, Prettier, TypeScript, and Jest configs

### Cons

- **Build coupling** — Changing a shared library rebuilds all dependent apps (mitigated by `nx affected`)
- **Shared dependency versions** — Upgrading a root-level package affects all apps at once

## Config Module

Wraps `@nestjs/config` with **Zod validation** and **namespaced factories** (`libs/common/src/config/`).

- **`createNamespacedConfig({ key, schema, map })`** — Validates `process.env` against a Zod schema at startup. Returns a factory with `.KEY` for `@Inject()`. The `map` parameter renames env vars to friendlier property names.
- **`AppConfigModule.forRoot({ namespaces })`** — Always loads base `appConfig` (NODE_ENV, SERVICE_NAME), merges additional namespaces. Global and cached.
- **App-level config** — Each app wraps this in a `{PascalName}ConfigModule` with a `{PascalName}ConfigService` using `@Inject(factory.KEY)`.

### Pros

- **Fail-fast** — Invalid env vars throw at startup with clear messages, not silently at runtime
- **Type-safe** — `ConfigType<typeof factory>` infers exact shape without manual interfaces
- **Namespace isolation** — Each namespace is independently validated and injected

### Cons

- **Indirection** — Adds abstraction over `@nestjs/config`'s `registerAs`
- **Dual registration** — Namespaces listed in both `forRoot({ namespaces })` and `@Inject()` in the config service

## Logger Module

Wraps **Pino** (via `nestjs-pino`) in a global `AppLoggerModule` (`libs/common/src/logger/`).

### Why Pino

Pino was chosen over alternatives (Winston, Bunyan, built-in NestJS logger) for several reasons:

- **Performance** — Pino is the fastest Node.js logger. It uses worker threads for transport processing (pretty-printing, file I/O) so the main thread only writes minimal JSON. In benchmarks it's 5-10x faster than Winston.
- **Structured JSON by default** — Every log line is a JSON object, ready for ingestion by log aggregators (ELK, Datadog, Loki) without custom formatting.
- **Low overhead** — Minimal serialization cost. Pino avoids string interpolation and deferred evaluation patterns that slow down other loggers.
- **First-class NestJS integration** — `nestjs-pino` provides automatic HTTP request/response logging, request context propagation, and `bufferLogs` support out of the box.
- **Transport ecosystem** — Pluggable transports (`pino-pretty`, `pino-roll`, `pino-elasticsearch`, etc.) run in separate worker threads, keeping the main event loop clean.

### Features

- **Pretty print** — Colorized single-line output in development via `pino-pretty`
- **File rotation** — Daily rotating log files via `pino-roll` with configurable retention
- **Request logging** — Automatic HTTP request/response logging with status-based log levels (5xx → error, 4xx → warn)
- **Request ID tracking** — Extracts `x-request-id` header or generates `untraced-{uuid}` fallback
- **Data redaction** — Automatically masks sensitive fields (passwords, tokens, card numbers, auth headers)
- **Silent mode** — `LOG_LEVEL=silent` disables all output (used in tests)
- **Global module** — `AppLogger` is injectable everywhere without per-module imports

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Log level threshold |
| `LOG_TO_FILE` | `false` | Enable daily rotating file logs |
| `LOG_DIR` | `logs` | Directory for log files |
| `LOG_RETENTION_DAYS` | `7` | Number of daily log files to keep |

### Pros

- **Minimal main-thread overhead** — Transports run in worker threads; the app only writes JSON to stdout
- **Production-ready defaults** — Structured JSON, data redaction, request tracing, and file rotation work out of the box
- **Test-friendly** — `LOG_LEVEL=silent` cleanly suppresses output; `forRootAsync` defers env reading so `beforeEach()` overrides work
- **Simple API** — `AppLogger` implements NestJS `LoggerService`, so it's a drop-in replacement for the built-in logger

### Cons

- **Transport overhead for file logging** — `pino-roll` adds a worker thread and file I/O; for high-throughput services, a sidecar log collector (Fluentd, Filebeat) may be preferable
- **No built-in log context** — Unlike Winston's `defaultMeta`, adding per-service context beyond `service`/`environment` requires manual `logger.log({ customField }, 'message')` calls
- **Reads `process.env` directly** — The logger bypasses the config module so it's available before config validation runs; this means logger env vars aren't Zod-validated at startup

## Exception Module

Centralized error handling with **structured error codes** and **transport-agnostic** exception resolution (`libs/common/src/exception/`).

### Error Code Format

Every error code is a 6-character string: `[Source][Domain][Seq]`

- **Source** — `A` (User/400), `B` (System/500), `C` (Third-party/502)
- **Domain** — 2-digit number, centrally registered in `ERROR_DOMAINS` (e.g. `00`=Common, `01`=Auth, `02`=Payments)
- **Seq** — 3-digit sequence within source+domain (001–999)

```typescript
const AUTH_ERRORS = defineErrorCodes({ domain: ERROR_DOMAINS.AUTH }, {
  USERNAME_TAKEN: { source: ERROR_SOURCE.USER, seq: 1, httpStatus: 409, message: 'Username "%s" already exists' },
  AUTH_SERVICE_DOWN: { source: ERROR_SOURCE.SYSTEM, seq: 1, message: 'Auth service unavailable' },
});
// → A01001 (409), B01001 (500 default)

throw new AppException(AUTH_ERRORS.USERNAME_TAKEN, { args: ['john'] });
// → 409, code: "A01001", message: "Username \"john\" already exists"
```

### Architecture

- **`ExceptionHandler`** — Injectable service with `resolve()` (exception → error info) and `log()` (warn for user errors, error for system/third-party). Transport-agnostic — reusable across HTTP, gRPC, GraphQL.
- **`AppExceptionFilter`** — Unified filter that auto-detects transport via `host.getType()`. HTTP → JSON response, RPC → `throwError()` observable, GraphQL → re-throws as `HttpException` with extensions.
- **`AppExceptionModule`** — Registers both. Import in app root module — transport detection is automatic.

### Pros

- **Fail-fast validation** — Domain format, source, seq range, and duplicate codes are all validated at definition time
- **Centralized domain registry** — `ERROR_DOMAINS` prevents domain number conflicts across microservices
- **Transport-agnostic** — Single filter auto-detects HTTP, gRPC, and GraphQL via `host.getType()` — no per-transport configuration needed
- **Uniform responses** — All exceptions (custom, NestJS built-in, unknown) produce the same structured error format

### Cons

- **HTTP status as canonical status** — `httpStatus` on `ErrorCodeDef` is HTTP-specific; other transports need a mapping layer (e.g. HTTP 404 → gRPC `NOT_FOUND`)
- **Static message templates** — `%s` interpolation is simple; complex formatting requires manual string building in `devMessage`

## Interceptor Module

Global response interceptor that wraps successful responses in a uniform envelope (`libs/common/src/interceptor/`).

### Transport Behavior

The `ResponseInterceptor` auto-detects transport via `context.getType()`:

| Transport | Behavior | traceId Source |
|-----------|----------|----------------|
| HTTP | Wraps in `{ success, data, timestamp, traceId }` | `request.id` |
| RPC (gRPC) | Wraps in `{ success, data, timestamp, traceId }` | gRPC metadata `x-request-id` |
| GraphQL | Pass-through | N/A — GraphQL engine manages `{ data, errors }` |

### Symmetric with Exception Module

Together, the interceptor and exception filter produce a consistent API:

```json
// Success (ResponseInterceptor)
{ "success": true, "data": { ... }, "timestamp": "...", "traceId": "..." }

// Error (AppExceptionFilter)
{ "success": false, "code": "A01001", "message": "...", "timestamp": "...", "traceId": "..." }
```

### Pros

- **Uniform API envelope** — All HTTP/RPC responses share the same `{ success, data, timestamp, traceId }` structure
- **Transport-agnostic** — Single interceptor auto-detects transport, no per-transport configuration
- **GraphQL-safe** — Correctly passes through for GraphQL, which has its own `{ data, errors }` protocol

### Cons

- **Envelope overhead for RPC** — Wrapping adds fields beyond the protobuf contract; clients must account for the envelope shape
- **No per-route opt-out** — All routes get wrapped; excluding specific routes requires a custom decorator

## Docker

Single parameterized `Dockerfile` (2-stage: development + production) with composable Docker Compose. Each app gets a `docker/<app>/compose.override.yml` that extends a shared `docker/base.yml` template.

| Command | Description |
|---------|-------------|
| `make build` | Build all Docker images |
| `make up` | Start all containers |
| `make down` | Stop all containers |
| `make logs` | Tail logs (interactive service selector) |

## Adding a New Microservice

1. `nest generate app <name>` then `pnpm install`
2. Create `apps/<name>/project.json` (copy from `apps/auth/project.json`, update name/tags)
3. Create `apps/<name>/jest.config.ts` and add `scope:<name>` to `eslint.config.mjs`
4. Register error domain in `libs/common/src/exception/exception.registry.ts`:
   ```typescript
   export const ERROR_DOMAINS = { ..., MY_SERVICE: '03' } as const;
   ```
5. Create `apps/<name>/src/errors.ts` with app-specific error codes:
   ```typescript
   export const MY_SERVICE_ERRORS = defineErrorCodes(
     { domain: ERROR_DOMAINS.MY_SERVICE },
     { ... },
   );
   ```
6. Import shared modules in the app root module:
   ```typescript
   imports: [
     MyServiceConfigModule,
     AppLoggerModule.forRoot(),
     AppExceptionModule,      // Error handling (auto-detects transport)
     AppInterceptorModule,    // Success response envelope (auto-detects transport)
   ]
   ```
7. Create `docker/<name>/.env.docker` and `docker/<name>/compose.override.yml`
8. Register in `docker-compose.yml` include list
9. `make build && make up`

## Development

```bash
pnpm install                                 # Install all dependencies
pnpm serve <app-name>                        # Dev server with watch mode
pnpm serve <app-name> --configuration=debug  # Debug mode
pnpm lint                                    # ESLint all projects
pnpm format                                  # Prettier
pnpm test                                    # Unit tests
pnpm test:e2e                                # E2E tests
pnpm affected -t test                        # Test only affected projects
```
