---
paths:
  - apps/**/src/**/*.controller.ts
  - apps/**/src/**/*.dto.ts
---

# API Conventions

- Use class-validator DTOs for request validation
- Use appropriate HTTP method decorators (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`)
- Return types should be explicit
- Group related endpoints in the same controller with a shared route prefix
