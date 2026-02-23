---
paths:
  - apps/*/drizzle/**
  - apps/*/drizzle.config.ts
  - apps/*/src/schemas.ts
  - apps/**/schemas/*.schema.ts
  - docker/entrypoint.sh
  - docker/migrate-with-lock.mjs
---

# Migration Patterns

## Overview

Migrations use **drizzle-kit** with a forward-only strategy (no automatic rollback). A custom Node.js script (`docker/migrate-with-lock.mjs`) wraps `drizzle-kit migrate` with PostgreSQL advisory lock, automatic database creation, and connection retry for safe multi-instance deployments.

## Local Development Workflow

```bash
# 1. Modify schema files (e.g., apps/auth/src/users/schemas/user.schema.ts)
# 2. Generate migration SQL (--name is optional but recommended)
pnpm db-generate auth --name add-user-avatar

# 3. Review the generated SQL in apps/auth/drizzle/
# 4. Apply migrations to local database
pnpm db-migrate auth

# 5. Open Drizzle Studio for visual inspection (optional)
pnpm db-studio auth
```

All three `db-*` commands forward extra arguments to `drizzle-kit`. The first argument is always the app name.

## Docker Workflow

Migrations run **automatically** on container startup:

```
Container start → entrypoint.sh → migrate-with-lock.mjs → Application
```

After modifying schemas and generating new migration files, rebuild the Docker image (`make build`) since `apps/{name}/drizzle/` is not volume-mounted in development.

## migrate-with-lock.mjs

The migration runner (`docker/migrate-with-lock.mjs`) performs the following steps:

1. **Wait for PostgreSQL** — Retries connecting to the default `postgres` database (up to 10 attempts, 3s interval)
2. **Ensure app database** — Checks `pg_database` and runs `CREATE DATABASE` if the app database doesn't exist
3. **Connect to app database** — Establishes connection for advisory lock
4. **Acquire advisory lock** — `pg_advisory_lock(lockId)` prevents concurrent migrations across multiple instances
5. **Run migrations** — Executes `drizzle-kit migrate` as a child process
6. **Release lock** — `pg_advisory_unlock(lockId)` releases the lock; also auto-releases if the connection drops

### Lock ID

Each app gets a unique lock ID derived from `md5(APP_NAME)` (first 4 bytes as int32). This prevents different services from blocking each other when sharing a PostgreSQL instance. Override with `MIGRATION_LOCK_ID` env var if needed.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | Yes | PostgreSQL port |
| `DB_NAME` | Yes | App database name (auto-created if missing) |
| `DB_USER` | Yes | PostgreSQL user |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `APP_NAME` | Yes | Used to derive the lock ID |
| `MIGRATION_LOCK_ID` | No | Override the auto-derived lock ID |

## File Structure

```
apps/auth/
├── src/
│   ├── schemas.ts                              # Barrel file for drizzle-kit
│   ├── users/schemas/user.schema.ts            # Domain schema definitions
│   ├── tokens/schemas/refresh-token.schema.ts
│   └── auth-methods/schemas/user-auth-method.schema.ts
├── drizzle/
│   ├── 0000_init.sql                           # Generated migration SQL
│   └── meta/                                   # Snapshots for diffing
└── drizzle.config.ts                           # drizzle-kit config
docker/
├── entrypoint.sh                               # Calls migrate-with-lock.mjs
└── migrate-with-lock.mjs                       # Advisory lock + auto DB creation
```

## Schema Conventions

- Schema files live in `apps/{name}/src/{domain}/schemas/{table}.schema.ts`
- Each app has a barrel file at `apps/{name}/src/schemas.ts` that re-exports all schemas
- `drizzle.config.ts` points to this barrel file via `schema: './apps/{name}/src/schemas.ts'`
- Snapshot files in `drizzle/meta/` must be committed to git — drizzle-kit uses them to compute diffs

## drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './apps/auth/src/schemas.ts',
  out: './apps/auth/drizzle',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: false,
  },
});
```

Set `ssl: false` for local/Docker PostgreSQL. For production with SSL, use `ssl: true` or provide certificate options.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Forward-only migrations (no rollback) | Drizzle's design; fix issues by writing a new migration. Mitigated by PR review of SQL + pre-deploy backups |
| Advisory lock per app | Prevents concurrent migration in multi-instance deployments without external tooling |
| Auto database creation | Eliminates dependency on `init-databases.sql`; new services work out of the box |
| Connection retry | Handles container startup ordering when PostgreSQL isn't ready yet |
| Uses existing `pg` package | No additional dependencies needed — `pg` is already a project dependency |

## Adding a New App with Migrations

1. Create schema files in `apps/{name}/src/{domain}/schemas/`
2. Create barrel file at `apps/{name}/src/schemas.ts`
3. Create `apps/{name}/drizzle.config.ts` pointing to the barrel file
4. Run `pnpm db-generate {name} --name init` to generate the initial migration
5. The Docker entrypoint auto-detects `apps/{name}/drizzle.config.ts` and runs migrations on startup
