# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 starter template using TypeScript, Express platform, pnpm as package manager.

## Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Compile (nest build, outputs to dist/)
pnpm run start:dev        # Dev server with watch mode
pnpm run start:debug      # Debug server with watch mode
pnpm run start:prod       # Production (node dist/main)
pnpm run lint             # ESLint with auto-fix
pnpm run format           # Prettier format src/ and test/
pnpm run test             # Unit tests (Jest, files matching *.spec.ts in src/)
pnpm run test -- --testPathPattern='app.controller' # Run a single test file
pnpm run test:e2e         # E2E tests (files matching *.e2e-spec.ts in test/)
pnpm run test:cov         # Unit tests with coverage report
```

## Architecture

Standard NestJS module structure with a single root `AppModule`:
- `src/main.ts` — Bootstrap entry point, listens on `process.env.PORT` or 3000
- `src/app.module.ts` — Root module registering controllers and providers
- `src/app.controller.ts` + `src/app.service.ts` — Default controller/service pair
- `test/` — E2E tests using supertest, configured via `test/jest-e2e.json`

Unit tests live alongside source files as `*.spec.ts`. E2E tests live in `test/` as `*.e2e-spec.ts`.

## Git Hooks

Pre-commit hook (via husky + lint-staged) runs `eslint --fix` on all staged `*.ts` files. Prettier formatting is included automatically since ESLint integrates prettier via `eslint-plugin-prettier`. Skip with `git commit --no-verify` if needed.

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
- Build excludes `node_modules`, `test`, `dist`, and `*.spec.ts` files (`tsconfig.build.json`)
