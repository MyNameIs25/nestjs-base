# Exception Module Patterns

## Error Code Format

Every error code is a 6-character string: `[Source][Domain][Seq]`

- **Source** (1 char): `A` = User, `B` = System, `C` = Third-party
- **Domain** (2 digits): Centrally registered in `ERROR_DOMAINS`
- **Seq** (3 digits): 001–999, unique within source+domain

Example: `A01001` = User error, Auth domain, seq 1

## Error Domain Registry (`exception.registry.ts`)

All domain numbers are centrally managed. When adding a new microservice, register its domain here:

```typescript
export const ERROR_DOMAINS = {
  COMMON: '00',
  AUTH: '01',
  PAYMENTS: '02',
} as const;
```

Use `ERROR_SOURCE` constants (not raw `'A'`/`'B'`/`'C'` strings) when defining error codes.

## Defining Error Codes

Each app defines its error codes in `apps/{name}/src/errors.ts`:

```typescript
import { defineErrorCodes, ERROR_DOMAINS, ERROR_SOURCE } from '@app/common';

export const AUTH_ERRORS = defineErrorCodes(
  { domain: ERROR_DOMAINS.AUTH },
  {
    USERNAME_TAKEN: {
      source: ERROR_SOURCE.USER,
      seq: 1,
      httpStatus: 409,
      message: 'Username "%s" already exists',
    },
    AUTH_SERVICE_DOWN: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 1,
      message: 'Auth service unavailable',  // defaults to 500
    },
  },
);
```

The factory validates domain (2-digit), source (A/B/C), seq (1–999), and detects duplicate codes. If `httpStatus` is omitted, defaults are: A→400, B→500, C→502.

## Throwing Exceptions

Use `AppException` for all errors. The error code's source determines the log level automatically — no need for separate exception classes.

```typescript
import { AppException, COMMON_ERRORS } from '@app/common';
import { AUTH_ERRORS } from './errors';

// User error — logged at warn level
throw new AppException(AUTH_ERRORS.USERNAME_TAKEN, { args: ['john'] });

// System error — logged at error level with stack trace
throw new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
  devMessage: 'Pool exhausted: 50/50 connections',
  cause: originalError,
});
```

### `AppExceptionOptions`

| Field | Type | Description |
|-------|------|-------------|
| `args` | `string[]` | Replaces `%s` placeholders in message template |
| `devMessage` | `string` | Developer context, shown only in non-production |
| `cause` | `Error` | Original error for stack chaining |

## Architecture — Handler + Unified Filter Pattern

The exception module separates transport-agnostic logic from transport-specific response formatting:

- **`ExceptionHandler`** (injectable service) — `resolve(exception)` maps any exception to `ResolvedError`; `log()` writes warn/error based on source. Transport-agnostic, reusable across HTTP/gRPC/GraphQL.
- **`AppExceptionFilter`** — Unified filter that auto-detects transport via `host.getType()` and delegates to the appropriate handler:
  - **HTTP** — Reads `request.id` for traceId, writes `ErrorResponseBody` JSON response
  - **RPC (gRPC)** — Returns `Observable` error with `{ code, message, status }` payload via `throwError()`
  - **GraphQL** — Re-throws as `HttpException` with error extensions for the GraphQL engine to format
- **`AppExceptionModule`** — Registers `ExceptionHandler` (exported) and `AppExceptionFilter` (via `APP_FILTER`). Users import only this module — transport detection is automatic.

## Module Setup

Import `AppExceptionModule` in the app root module:

```typescript
@Module({
  imports: [
    AuthConfigModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
  ],
})
export class AuthModule {}
```

## HTTP Response Format

All exceptions produce a uniform JSON response:

```json
{
  "success": false,
  "code": "A01001",
  "message": "Username \"john\" already exists",
  "devMessage": "...",
  "timestamp": "2026-02-21T...",
  "traceId": "req-123"
}
```

`devMessage` is only included in non-production environments.

## Five Exception Categories in the Handler

| # | Category | Example | Resolution |
|---|----------|---------|------------|
| 1 | `AppException` | Business code `throw` | Uses its `errorCode` directly |
| 2 | NestJS `HttpException` | Guard 401, Pipe 400 | Maps via `HTTP_STATUS_TO_ERROR` → `COMMON_ERRORS` |
| 3 | `RpcException` | `@nestjs/microservices` errors | Falls back to `INTERNAL_SERVER_ERROR` (500) |
| 4 | `GraphQLError` | Query validation, parse errors | Falls back to `BAD_REQUEST` (400) |
| 5 | Unknown error | `TypeError`, `null` | Falls back to `INTERNAL_SERVER_ERROR` (500) |

Order matters — `AppException extends HttpException`, so Case 1 must precede Case 2.

## Log Level by Source

| Source | Constant | Log Level | Stack Trace |
|--------|----------|-----------|-------------|
| `A` | `ERROR_SOURCE.USER` | `warn` | No |
| `B` | `ERROR_SOURCE.SYSTEM` | `error` | Yes |
| `C` | `ERROR_SOURCE.THIRD_PARTY` | `error` | Yes |

## Testing

Mock `ExceptionHandler` with `useValue` in unit tests — do not import the exception module:

```typescript
{
  provide: ExceptionHandler,
  useValue: {
    resolve: jest.fn().mockReturnValue({
      errorCode: COMMON_ERRORS.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      status: 500,
    }),
    log: jest.fn(),
  },
}
```
