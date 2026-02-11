---
description: Config module patterns — Zod schemas, namespaced config, AppConfigModule, app-level config services
globs:
  - apps/**/src/config/**/*.ts
  - libs/common/src/config/**/*.ts
---

# Config Module Patterns

## `createNamespacedConfig` (libs/common)

Factory that wraps `@nestjs/config` `registerAs` with Zod validation:

```typescript
createNamespacedConfig({ key, schema })
```

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | Namespace key (e.g. `'database'`). Used as injection token via `factory.KEY` |
| `schema` | `z.ZodObject` | Zod schema validating `process.env` |

Returns a factory with:
- `.KEY` — injection token (`CONFIGURATION(database)`) for `@Inject()`

The factory returns `z.infer<TSchema>` directly — property names match env var names (e.g. `config.database.DB_HOST`).

## `AppConfigModule.forRoot()` (libs/common)

Dynamic module wrapping `ConfigModule.forRoot()`:

```typescript
AppConfigModule.forRoot({
  namespaces: [databaseConfig, redisConfig],
})
```

- Always loads `appConfig` (NODE_ENV, SERVICE_NAME) automatically
- Merges additional `namespaces[]` into the config load
- Sets `isGlobal: true` and `cache: true`

## App-Level Config Pattern

Each app creates a `{PascalName}ConfigService` using `@Inject(factory.KEY)` for each namespace. Register it as a provider in the app module.

### Config Service

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { AppConfig, appConfig } from '@app/common';
import { databaseConfig, DatabaseConfig } from './schemas/database.config';

@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(appConfig.KEY)
    readonly app: AppConfig,

    @Inject(databaseConfig.KEY)
    readonly database: DatabaseConfig,
  ) {}
}
```

- Use `@Inject(factory.KEY)` for each namespace — type-safe, no boilerplate
- Always include `appConfig` for NODE_ENV, SERVICE_NAME
- Access env vars by their original names: `this.app.SERVICE_NAME`, `this.database.DB_HOST`

### App Root Module

```typescript
@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [databaseConfig],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthConfigService, AuthService],
})
export class AuthModule {}
```

`AppConfigModule.forRoot()` loads the config factories. The config service is a regular provider in the module.

### Config Schema Files

Each namespace gets its own file at `apps/{name}/src/config/schemas/{namespace}.config.ts`:

```typescript
import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const databaseSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
});

export const databaseConfig = createNamespacedConfig({
  key: 'database',
  schema: databaseSchema,
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
```

## Testing

Mock `{PascalName}ConfigService` with `useValue` — do not import config modules in unit tests:

```typescript
{
  provide: AuthConfigService,
  useValue: {
    app: { NODE_ENV: 'test', SERVICE_NAME: 'auth' },
    database: { DB_HOST: 'localhost', DB_PORT: 5432, DB_NAME: 'auth_db' },
  },
}
```

## `.env.example` Conventions

- Group env vars by namespace with a `# {Namespace}` comment header
- Base vars (`NODE_ENV`, `SERVICE_NAME`, `PORT`) come first
- Namespace-specific vars follow their comment header
- Use realistic default values in the example file

## Zod v4 Notes

- `.merge()` is deprecated — use `.extend(other.shape)` instead
- `z.ZodIssue` is deprecated — use `z.core.$ZodIssue` instead
- `z.core.$ZodIssue.path` is `PropertyKey[]` — use `.map(String).join('.')` for formatting
