---
paths:
  - apps/**/src/**/*.spec.ts
  - libs/**/src/**/*.spec.ts
  - apps/**/test/**/*.e2e-spec.ts
---

# Testing Conventions

## Unit tests (`*.spec.ts` in `src/`)

- Use `Test.createTestingModule` from `@nestjs/testing` to compile a fresh module in `beforeEach`
- `describe` block named after the class under test
- Co-locate test files alongside source files

## E2E tests (`*.e2e-spec.ts` in `test/`)

- Import the root `AppModule` and create a full `INestApplication`
- Use `supertest` for HTTP assertions
- Initialize the app in `beforeEach`, close it in `afterAll`
- Set `process.env.LOG_LEVEL = 'silent'` in `beforeEach` to suppress logger output

## Mocking `AppLogger` in Unit Tests

When a service depends on `AppLogger`, provide a mock in the test module:

```typescript
{
  provide: AppLogger,
  useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}
```

Do not import `AppLoggerModule` in unit tests — mock the service directly.
