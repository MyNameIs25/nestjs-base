# /create-microservice

Scaffold a new NestJS microservice app in the monorepo. Creates all source files, Docker setup, Nx project config, and updates shared configs.

## Usage

```bash
/create-microservice <name>
```

`<name>` is the lowercase, hyphen-separated service name (e.g. `payments`, `user-profile`).

## Workflow

### 1. Validate

- Ensure `<name>` is provided. If missing, ask the user.
- Ensure `<name>` is lowercase and uses only letters, numbers, and hyphens.
- Ensure `apps/<name>/` does not already exist. If it does, abort with a message.

### 2. Ask port

Prompt the user for the HTTP port number this service should listen on (e.g. 3001). Default ports in use:

- 3000 — auth
- 3001 — payments

### 3. Derive names

From the raw `<name>`, derive:

| Placeholder    | Example (`payment-gateway`) | Rule                                                  |
| -------------- | --------------------------- | ----------------------------------------------------- |
| `{name}`       | `payment-gateway`           | Raw input                                             |
| `{PascalName}` | `PaymentGateway`            | Split on `-`, capitalize first letter of each segment |
| `{camelName}`  | `paymentGateway`            | PascalName with lowercased first letter               |
| `{port}`       | `3001`                      | From step 2                                           |

### 4. Create app files (11 files)

#### `apps/{name}/package.json`

```json
{
  "name": "{name}",
  "version": "0.0.1",
  "private": true,
  "dependencies": {},
  "devDependencies": {}
}
```

#### `apps/{name}/tsconfig.app.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/{name}"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

#### `apps/{name}/project.json`

```json
{
  "name": "{name}",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/{name}/src",
  "projectType": "application",
  "tags": ["scope:{name}", "type:app"],
  "targets": {
    "build": {},
    "serve": {},
    "test": {},
    "lint": {},
    "e2e": {}
  }
}
```

#### `apps/{name}/jest.config.ts`

```typescript
export default {
  displayName: '{name}',
  preset: '../../jest.preset.js',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/../../libs/common/src/$1',
  },
  coverageDirectory: '../../coverage/apps/{name}',
};
```

#### `apps/{name}/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { {PascalName}Module } from './{name}.module';

async function bootstrap() {
  const app = await NestFactory.create({PascalName}Module);
  await app.listen(process.env.PORT ?? {port});
}
bootstrap();
```

#### `apps/{name}/src/{name}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { {PascalName}Controller } from './{name}.controller';
import { {PascalName}Service } from './{name}.service';

@Module({
  imports: [],
  controllers: [{PascalName}Controller],
  providers: [{PascalName}Service],
})
export class {PascalName}Module {}
```

#### `apps/{name}/src/{name}.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { {PascalName}Service } from './{name}.service';

@Controller()
export class {PascalName}Controller {
  constructor(private readonly {camelName}Service: {PascalName}Service) {}

  @Get()
  getHello(): string {
    return this.{camelName}Service.getHello();
  }
}
```

#### `apps/{name}/src/{name}.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { {PascalName}Controller } from './{name}.controller';
import { {PascalName}Service } from './{name}.service';

describe('{PascalName}Controller', () => {
  let {camelName}Controller: {PascalName}Controller;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [{PascalName}Controller],
      providers: [{PascalName}Service],
    }).compile();

    {camelName}Controller = app.get<{PascalName}Controller>({PascalName}Controller);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect({camelName}Controller.getHello()).toBe('Hello World!');
    });
  });
});
```

#### `apps/{name}/src/{name}.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class {PascalName}Service {
  getHello(): string {
    return 'Hello World!';
  }
}
```

#### `apps/{name}/test/app.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { {PascalName}Module } from './../src/{name}.module';

describe('{PascalName}Controller (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [{PascalName}Module],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
```

#### `apps/{name}/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@app/common(|/.*)$": "<rootDir>/../../../libs/common/src/$1"
  }
}
```

### 5. Create Docker files (2 files)

#### `docker/{name}/.env.docker`

```dotenv
APP_NAME={name}
```

#### `docker/{name}/compose.override.yml`

```yaml
services:
  {name}:
    extends:
      file: docker/base.yml
      service: app
    ports:
      - '{port}:{port}'
```

### 6. Update configs

#### `nest-cli.json`

Add a new entry inside `"projects"`:

```json
"{name}": {
  "type": "application",
  "root": "apps/{name}",
  "entryFile": "main",
  "sourceRoot": "apps/{name}/src",
  "compilerOptions": {
    "tsConfigPath": "apps/{name}/tsconfig.app.json"
  }
}
```

#### `docker-compose.yml`

Append a new include block:

```yaml
  # {PascalName} service
  - path: docker/{name}/compose.override.yml
    project_directory: .
    env_file: docker/{name}/.env.docker
```

#### `eslint.config.mjs`

If the new app needs its own scope boundary, add a depConstraint entry inside the `@nx/enforce-module-boundaries` rule:

```js
{
  sourceTag: 'scope:{name}',
  onlyDependOnLibsWithTags: ['scope:shared', 'scope:{name}'],
},
```

No changes to `package.json` are needed — the existing root scripts use Nx `run-many` and pick up new projects automatically.

### 7. Install and verify

Run:

```bash
pnpm install
```

Print next steps to the user:

```text
Scaffolded {name} microservice:
  - App source:  apps/{name}/src/
  - Docker:      docker/{name}/
  - Port:        {port}

Next steps:
  pnpm serve {name}                        # Dev server with watch
  pnpm test                                # Unit tests
  pnpm test:e2e                            # E2E tests
  make up                                  # Start all services in Docker
```
