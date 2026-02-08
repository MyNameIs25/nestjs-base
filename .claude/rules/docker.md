---
paths:
  - Dockerfile
  - docker-compose.yml
  - docker/**/*.yml
  - docker/**/.env.docker
  - Makefile
  - .dockerignore
---

# Docker Conventions

## Modular Compose Architecture

The project uses a **base + override** pattern:

- `docker/base.yml` — shared service definition (build context, dev command, volume mounts)
- `docker/<app>/compose.override.yml` — per-app service that `extends` the base and adds port mappings
- `docker/<app>/.env.docker` — sets `APP_NAME` for the compose override
- `docker-compose.yml` — top-level file that `include`s all per-app overrides

### Adding a new service

1. Create `docker/<name>/.env.docker` with `APP_NAME=<name>`
2. Create `docker/<name>/compose.override.yml` that extends `docker/base.yml` and maps the app's port
3. Add an `include` entry in `docker-compose.yml`

## `APP_NAME` Build Arg Flow

`APP_NAME` flows through the system as follows:

```text
.env.docker → compose.override.yml (extends base.yml) → Dockerfile ARG
```

The Dockerfile uses `APP_NAME` to:

- Copy only the target app's `package.json` and source
- Run `npx nx build $APP_NAME`
- Set the production `CMD` to `node dist/apps/$APP_NAME/main`

## Dockerfile Stages

The `Dockerfile` is a 2-stage multi-stage build:

1. **development** — installs all dependencies, copies source, builds the app
2. **production** — installs only production dependencies, copies built artifacts from the development stage

Always use `--target development` for dev and `--target production` for prod builds.

## Volume Mounts for Hot Reload

In development, `docker/base.yml` bind-mounts:

- `apps/<APP_NAME>/src/` — the app's source directory
- `libs/common/src/` — the shared library source

This allows `nx serve` inside the container to detect file changes on the host.

When adding a new shared library, add its `src/` directory as an additional volume mount in `docker/base.yml`.

## Port Management

Each app maps a unique host port to its container port:

| App      | Port |
| -------- | ---- |
| auth     | 3000 |
| payments | 3001 |

When adding a new service, choose a port that doesn't conflict with existing services. The port in `compose.override.yml` must match the port in `apps/<name>/src/main.ts`.

## Makefile Commands

- `make build` — build all compose services
- `make up` — start all services in detached mode
- `make down` — stop all services
- `make logs` — interactive log viewer (pick a service or view all)

## .dockerignore

The `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.husky`, `.claude`, `coverage`, `.env*`, markdown files, and IDE directories. Keep it updated when adding new non-runtime directories.
