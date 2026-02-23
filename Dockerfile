FROM node:22-alpine AS development

ARG APP_NAME
ENV APP_NAME=$APP_NAME

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json
COPY nx.json nx.json
COPY jest.preset.js jest.preset.js

COPY apps/${APP_NAME}/package.json apps/${APP_NAME}/package.json

RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile

COPY apps/${APP_NAME} apps/${APP_NAME}
COPY libs libs
COPY docker/entrypoint.sh docker/entrypoint.sh
COPY docker/migrate-with-lock.mjs docker/migrate-with-lock.mjs

RUN pnpm -w exec nx build ${APP_NAME}


FROM node:22-alpine AS production

ARG APP_NAME
ARG NODE_ENV=production
ENV APP_NAME=$APP_NAME
ENV NODE_ENV=$NODE_ENV
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.json
COPY apps/${APP_NAME}/package.json apps/${APP_NAME}/package.json

RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile

COPY --from=development /usr/src/app/dist ./dist
COPY apps/${APP_NAME}/drizzle apps/${APP_NAME}/drizzle
COPY apps/${APP_NAME}/drizzle.config.ts apps/${APP_NAME}/drizzle.config.ts
COPY docker/entrypoint.sh docker/entrypoint.sh
COPY docker/migrate-with-lock.mjs docker/migrate-with-lock.mjs

RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

ENTRYPOINT ["/bin/sh", "docker/entrypoint.sh"]
CMD sh -c "exec node dist/apps/${APP_NAME}/main"
