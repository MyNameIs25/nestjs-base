# NestJS Base

A NestJS monorepo built incrementally to compare different library implementations for logging, error handling, config, and more. Each step is a separate branch and PR so you can follow the design decisions and trade-offs.

## Development Timeline

| # | PR | Description |
|---|-----|-------------|
| 1 | [Convert to NestJS monorepo](https://github.com/MyNameIs25/nestjs-base/pull/1) | Set up pnpm workspaces, split into auth and payments apps, add Docker and Makefile |
| 2 | [Add Nx build orchestration and CI](https://github.com/MyNameIs25/nestjs-base/pull/2) | Add Nx for caching, task pipelines, module boundaries, and GitHub Actions CI workflow |
| `3-1` | [Add config module with Zod validation](https://github.com/MyNameIs25/nestjs-base/pull/3) | Wrap `@nestjs/config` with Zod schemas, namespaced factories, and `@Inject(factory.KEY)` pattern |
| `3-2` | [Remove map parameter from config factory](https://github.com/MyNameIs25/nestjs-base/pull/4) | Simplify `createNamespacedConfig` to return env var names directly instead of mapped properties |
