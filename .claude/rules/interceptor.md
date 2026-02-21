# Interceptor Module Patterns

## ResponseInterceptor (`interceptor/response/response.interceptor.ts`)

Global interceptor (via `APP_INTERCEPTOR`) that wraps successful responses in a uniform envelope. Auto-detects transport via `context.getType()`.

### Transport Behavior

| Transport | Behavior | Reason |
|-----------|----------|--------|
| HTTP | Wraps in `SuccessResponseBody` | Consistent JSON API envelope |
| RPC (gRPC) | Wraps in `SuccessResponseBody` | Consistent envelope, traceId from gRPC metadata |
| GraphQL | Pass-through (`next.handle()`) | GraphQL engine manages its own `{ data, errors }` envelope |

### SuccessResponseBody

```typescript
interface SuccessResponseBody<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  traceId: string;
}
```

### traceId Extraction

| Transport | Source |
|-----------|--------|
| HTTP | `request.id` (set by request ID middleware) |
| RPC | `metadata.get('x-request-id')` from gRPC call context |
| GraphQL | N/A (pass-through) |

## AppInterceptorModule

```typescript
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor }],
})
export class AppInterceptorModule {}
```

Import in the app root module alongside `AppExceptionModule`:

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

## Paired with Exception Module

The interceptor and exception filter together produce a symmetric API:

- **Success** → `ResponseInterceptor` wraps: `{ success: true, data, timestamp, traceId }`
- **Error** → `AppExceptionFilter` catches: `{ success: false, code, message, timestamp, traceId }`

Both auto-detect transport — users import `AppInterceptorModule` + `AppExceptionModule` without choosing HTTP/RPC/GraphQL.

## Testing

Mock the interceptor or test the response shape directly:

```typescript
// Unit test — verify wrapping
const context = {
  getType: () => 'http',
  switchToHttp: () => ({
    getRequest: () => ({ id: 'req-1' }),
  }),
} as unknown as ExecutionContext;
```

For E2E tests, verify the envelope shape:

```typescript
const { body } = await request(app.getHttpServer()).get('/').expect(200);
expect(body.success).toBe(true);
expect(body.data).toBeDefined();
expect(body.traceId).toBeDefined();
```
