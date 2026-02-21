# Middleware Module Patterns

## RequestIdMiddleware (`middleware/request-id/request-id.middleware.ts`)

Sets `request.id` and the `X-Request-Id` response header before any other processing. This decouples request tracing from logging — pino, interceptors, and exception filters simply read `request.id`.

### Behavior

1. Reads `x-request-id` from incoming request headers
2. If present and non-empty, uses it as-is (client correlation)
3. If absent or empty, generates a new `crypto.randomUUID()`
4. Sets `req.id` for downstream consumers
5. Sets `X-Request-Id` response header for client correlation

### Constants

```typescript
export const REQUEST_ID_HEADER = 'x-request-id';
```

## AppMiddlewareModule

```typescript
@Module({})
export class AppMiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

Import **before** `AppLoggerModule` in the app root module so `req.id` is set before pino-http reads it:

```typescript
@Module({
  imports: [
    AuthConfigModule,
    AppMiddlewareModule,         // sets req.id first
    AppLoggerModule.forRoot(),   // pino reads req.id via genReqId
    AppExceptionModule,
    AppInterceptorModule,
  ],
})
export class AuthModule {}
```

## Request Flow

```
Request → RequestIdMiddleware (sets req.id + response header)
        → pino-http (reads req.id via genReqId)
        → Controller
        → ResponseInterceptor / AppExceptionFilter (reads req.id for envelope)
```

## Integration with Other Modules

| Module | How it uses `req.id` |
|--------|---------------------|
| Logger (`pino-http`) | `genReqId` reads `req.id` (fallback: `crypto.randomUUID()`) |
| `ResponseInterceptor` | Reads `request.id` for `traceId` in success envelope |
| `AppExceptionFilter` | Reads `request.id` for `traceId` in error envelope |

## Testing

Unit test the middleware directly:

```typescript
const req = { headers: {} } as unknown as Request;
const res = { setHeader: jest.fn() } as unknown as Response;
const next = jest.fn();

new RequestIdMiddleware().use(req, res, next);
expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
```

For E2E tests, verify the header and envelope:

```typescript
const { body, headers } = await request(app.getHttpServer()).get('/').expect(200);
expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
expect(body.traceId).toBe(headers['x-request-id']);
```
