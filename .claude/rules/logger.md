---
paths:
  - libs/common/src/logger/**/*.ts
  - apps/**/src/**/*.ts
---

# Logger Module Patterns

## `AppLoggerModule` (libs/common)

Global dynamic module wrapping `nestjs-pino`. Two initialization methods:

```typescript
// Static (reads env vars at DI resolution time)
AppLoggerModule.forRoot({ level: 'debug', logToFile: true })

// Async (for injecting dependencies into the factory)
AppLoggerModule.forRootAsync({
  imports: [SomeModule],
  useFactory: (dep: SomeDep) => ({ level: dep.getLevel() }),
  inject: [SomeDep],
})
```

Both return a global module — `AppLogger` is injectable everywhere without per-module imports.

## Bootstrap Pattern

```typescript
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(AppLogger));
```

- `bufferLogs: true` buffers logs until the logger is ready (prevents early log loss)
- `app.useLogger()` replaces the built-in NestJS logger with `AppLogger`

## AppLogger API

`AppLogger` implements `LoggerService` from `@nestjs/common`:

```typescript
logger.log(message, ...optionalParams)
logger.error(message, ...optionalParams)
logger.warn(message, ...optionalParams)
logger.debug(message, ...optionalParams)
logger.verbose(message, ...optionalParams)
logger.fatal(message, ...optionalParams)
```

## Options Resolution Order

Each option resolves first-wins: explicit option > env var > computed default.

| Option | Env var | Default |
|--------|---------|---------|
| `level` | `LOG_LEVEL` | `debug` (dev) / `info` (prod) |
| `prettyPrint` | — | `true` in dev |
| `logToFile` | `LOG_TO_FILE` | `false` |
| `logDir` | `LOG_DIR` | `logs` |
| `logRetentionDays` | `LOG_RETENTION_DAYS` | `7` |
| `redactPaths` | — | `DEFAULT_REDACT_PATHS` |
| `exclude` | — | `[]` |

## Direct `process.env` Usage

The logger reads `process.env` directly — **not** through the config module. This is intentional: the logger must be available to capture config validation errors during bootstrap.

## Testing

### Unit tests — mock `AppLogger` with `useValue`

```typescript
{
  provide: AppLogger,
  useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}
```

### E2E tests — silence via env var

```typescript
beforeEach(async () => {
  process.env.LOG_LEVEL = 'silent';
  // ... create module from real AppModule
});
```

`forRootAsync` defers env reading to DI time, so `beforeEach()` overrides take effect.

## Adding New Redact Paths

Add paths to `DEFAULT_REDACT_PATHS` in `logger.constants.ts`. Uses Pino's redaction syntax:
- `*.fieldName` — redacts `fieldName` at any depth
- `req.headers.authorization` — redacts a specific nested path
