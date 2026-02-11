# /add-config-module

Add app-level config module to an existing microservice. Creates Zod-validated namespaced config schemas, a config service using `@Inject(factory.KEY)`, and updates the app's module/service/tests.

## Usage

```bash
/add-config-module <name>
```

`<name>` is the app directory name (e.g. `auth`, `payments`, `user-profile`).

## Workflow

### 1. Validate

- Ensure `<name>` is provided. If missing, ask the user.
- Ensure `apps/{name}/` exists. If not, abort with a message.
- Ensure `apps/{name}/src/config/` does **not** exist. If it does, abort — config is already set up.

### 2. Ask namespaces

Prompt the user for one or more config namespaces (e.g. `database`, `redis`, `cache`).

For each namespace, collect:

| Field | Description | Example |
|-------|-------------|---------|
| Namespace key | Unique config key | `database` |
| Env vars | Environment variable names + Zod type | `DB_HOST: z.string()`, `DB_PORT: z.coerce.number()` |
| Property map | Mapped property names → env var names | `host → DB_HOST`, `port → DB_PORT` |

### 3. Derive names

From the raw `<name>`, derive:

| Placeholder    | Example (`payment-gateway`) | Rule                                                  |
| -------------- | --------------------------- | ----------------------------------------------------- |
| `{name}`       | `payment-gateway`           | Raw input                                             |
| `{PascalName}` | `PaymentGateway`            | Split on `-`, capitalize first letter of each segment |
| `{camelName}`  | `paymentGateway`            | PascalName with lowercased first letter               |

### 4. Create config files

#### `apps/{name}/src/config/schemas/{namespace}.config.ts` (one per namespace)

```typescript
import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const {namespace}Schema = z.object({
  // env vars with Zod types from step 2
});

export const {namespace}Config = createNamespacedConfig({
  key: '{namespace}',
  schema: {namespace}Schema,
  map: { /* property: 'ENV_VAR' from step 2 */ },
});

export type {PascalNamespace}Config = ConfigType<typeof {namespace}Config>;
```

#### `apps/{name}/src/config/config.service.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { AppConfig, appConfig } from '@app/common';
// import each namespace config + type
import { {namespace}Config, {PascalNamespace}Config } from './schemas/{namespace}.config';

@Injectable()
export class {PascalName}ConfigService {
  constructor(
    @Inject(appConfig.KEY)
    readonly app: AppConfig,

    @Inject({namespace}Config.KEY)
    readonly {namespaceProperty}: {PascalNamespace}Config,
  ) {}
}
```

The `readonly` property name for each namespace should be a short alias (e.g. `database` for database, `redis` for redis, `cache` for cache). Use judgement based on the namespace key.

#### `apps/{name}/src/config/index.ts`

```typescript
export * from './config.service';
```

### 5. Update existing files

#### `apps/{name}/src/{name}.module.ts`

Replace the existing module imports with `AppConfigModule.forRoot()` and add the config service as a provider:

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { {PascalName}ConfigService } from './config';
import { {namespace}Config } from './config/schemas/{namespace}.config';
import { {PascalName}Controller } from './{name}.controller';
import { {PascalName}Service } from './{name}.service';

@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [/* all namespace config factories */],
    }),
  ],
  controllers: [{PascalName}Controller],
  providers: [{PascalName}ConfigService, {PascalName}Service],
})
export class {PascalName}Module {}
```

#### `apps/{name}/src/{name}.service.ts`

Inject `{PascalName}ConfigService`:

```typescript
import { Injectable } from '@nestjs/common';
import { {PascalName}ConfigService } from './config';

@Injectable()
export class {PascalName}Service {
  constructor(private readonly config: {PascalName}ConfigService) {}

  getHello(): string {
    return `Hello from ${this.config.app.serviceName}!`;
  }
}
```

#### `apps/{name}/src/{name}.controller.spec.ts`

Mock `{PascalName}ConfigService` with `useValue`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { {PascalName}Controller } from './{name}.controller';
import { {PascalName}Service } from './{name}.service';
import { {PascalName}ConfigService } from './config';

describe('{PascalName}Controller', () => {
  let {camelName}Controller: {PascalName}Controller;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [{PascalName}Controller],
      providers: [
        {PascalName}Service,
        {
          provide: {PascalName}ConfigService,
          useValue: {
            app: { nodeEnv: 'test', serviceName: '{name}' },
            // one property per namespace with realistic defaults
            {namespaceProperty}: { /* mapped properties with test defaults */ },
          },
        },
      ],
    }).compile();

    {camelName}Controller = app.get<{PascalName}Controller>({PascalName}Controller);
  });

  describe('root', () => {
    it('should return greeting with service name', () => {
      expect({camelName}Controller.getHello()).toBe('Hello from {name}!');
    });
  });
});
```

#### `apps/{name}/.env.example`

Append env vars for each namespace with section comments:

```dotenv
# {PascalNamespace}
{ENV_VAR}={default_value}
```

### 6. Verify

Run:

```bash
pnpm test
pnpm lint
```

Fix any errors before finishing.

### 7. Summary

Print next steps to the user:

```text
Added config module to {name}:
  - Config schemas: apps/{name}/src/config/schemas/
  - Config service: apps/{name}/src/config/config.service.ts
  - Namespaces:     {namespace1}, {namespace2}, ...

The {PascalName}ConfigService is now injected across the app.
Access config via: this.config.app.*, this.config.{namespaceProperty}.*
```

## Reference implementation

`apps/auth/src/config/` — Auth app with `database` namespace.
