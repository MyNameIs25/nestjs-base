---
paths:
  - src/**/*.ts
---

# NestJS Structural Conventions

- One module, controller, or service per file
- File naming: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`
- Use constructor injection — never property injection
- Modules register their own controllers and providers
- Use `@nestjs/common` decorators (`@Controller`, `@Injectable`, `@Module`, `@Get`, `@Post`, etc.)
- Keep controllers thin — business logic belongs in services
