---
paths:
  - libs/common/src/database/**/*.ts
  - apps/**/src/**/*.ts
---

# Database Module Patterns

## `AppDatabaseModule` (libs/common)

Global dynamic module wrapping Drizzle ORM with `node-postgres`. Two initialization methods:

```typescript
// Static (direct pool config)
AppDatabaseModule.forRoot({
  pool: { host: 'localhost', port: 5432, database: 'mydb', user: 'user', password: 'pass' },
})

// Async (for injecting config service)
AppDatabaseModule.forRootAsync({
  inject: [AuthConfigService],
  useFactory: (config: AuthConfigService) => ({
    pool: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    },
  }),
})
```

Both return a global module — `@InjectDrizzle()` works everywhere without per-module imports.

## Pool Defaults

The module applies sensible defaults merged under user-provided config:

| Option | Default |
|--------|---------|
| `max` | `20` |
| `idleTimeoutMillis` | `10_000` |
| `connectionTimeoutMillis` | `10_000` |

Override by passing them in `pool: { ... }`.

## Graceful Shutdown

`AppDatabaseModule` implements `OnApplicationShutdown` — the `pg.Pool` is closed automatically when the app shuts down. No manual cleanup needed.

## Injection

Use `@InjectDrizzle()` to inject the Drizzle instance. The `DRIZZLE` symbol is the underlying injection token.

```typescript
import { InjectDrizzle, DrizzleDB } from '@app/common';

@Injectable()
export class SomeService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}
}
```

## BaseRepository

Abstract generic class providing standard CRUD operations. Repositories extend it with a concrete Drizzle table type.

### Generic Parameters

```typescript
BaseRepository<TTable, TSelect, TInsert>
```

| Param | Default | Description |
|-------|---------|-------------|
| `TTable` | — | Drizzle table type (`typeof users`) |
| `TSelect` | `InferSelectModel<TTable>` | Row type returned by queries |
| `TInsert` | `InferInsertModel<TTable>` | Data type for inserts |

### Constructor

```typescript
constructor(db: NodePgDatabase, table: TTable, idColumn: PgColumn)
```

- `db` — Drizzle instance (injected via `@InjectDrizzle()`)
- `table` — Drizzle table object (e.g., `users`)
- `idColumn` — Primary key column (e.g., `users.id`)

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `findAll()` | `Promise<TSelect[]>` | All rows |
| `findOne(where)` | `Promise<TSelect \| undefined>` | First matching row |
| `findById(id)` | `Promise<TSelect \| undefined>` | By primary key |
| `create(data)` | `Promise<TSelect>` | Insert one, returns created row |
| `createMany(data)` | `Promise<TSelect[]>` | Insert many, returns created rows |
| `update(where, data)` | `Promise<TSelect[]>` | Update matching rows |
| `updateById(id, data)` | `Promise<TSelect \| undefined>` | Update by primary key |
| `delete(where)` | `Promise<TSelect[]>` | Delete matching rows |
| `deleteById(id)` | `Promise<TSelect \| undefined>` | Delete by primary key |

All mutating methods use `.returning()` to return affected rows.

## Creating a Repository

### 1. Define the Drizzle Schema

Place schema files in the app's domain directory (e.g., `apps/auth/src/users/user.schema.ts`):

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: varchar({ length: 255 }).notNull().unique(),
  username: varchar({ length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Use `snake_case` for column names in the database (pass as first arg to column builders) and `camelCase` for TypeScript property names.

### 2. Create the Repository

```typescript
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BaseRepository, InjectDrizzle, DrizzleDB } from '@app/common';
import { users } from './user.schema';

@Injectable()
export class UserRepository extends BaseRepository<typeof users> {
  constructor(@InjectDrizzle() db: DrizzleDB) {
    super(db, users, users.id);
  }

  async findByEmail(email: string) {
    return this.findOne(eq(users.email, email));
  }
}
```

### 3. Encapsulate in a Domain Module

```typescript
@Module({
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UsersModule {}
```

Do **not** export the schema from the barrel — only the repository and module. Controllers/services should access data through the repository, not raw table objects.

### 4. Wire into the App Root Module

```typescript
@Module({
  imports: [
    AuthConfigModule,
    AppMiddlewareModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
    AppDatabaseModule.forRootAsync({
      inject: [AuthConfigService],
      useFactory: (config: AuthConfigService) => ({
        pool: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
          user: config.database.user,
          password: config.database.password,
        },
      }),
    }),
    UsersModule,
  ],
})
export class AuthModule {}
```

## Database Config Schema

Each app defines database env vars in `apps/{name}/src/config/schemas/database.config.ts`:

```typescript
const databaseSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
});

export const databaseConfig = createNamespacedConfig({
  key: 'database',
  schema: databaseSchema,
  map: { host: 'DB_HOST', port: 'DB_PORT', name: 'DB_NAME', user: 'DB_USER', password: 'DB_PASSWORD' },
});
```

## Testing

### Unit tests — mock the Drizzle db with chainable jest.fn()

```typescript
const mockReturning = jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]);
const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });
// ... wire all chains

const db = { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete } as any;
const repository = new UserRepository(db);
```

### E2E tests — add all DB env vars

```typescript
beforeEach(async () => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'auth_db';
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = 'postgres';
});
```

### Mock repository in service tests

```typescript
{
  provide: UserRepository,
  useValue: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
  },
}
```
