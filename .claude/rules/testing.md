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
