FROM node:22-alpine AS development

ARG APP_NAME

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

RUN pnpm -w exec nx build ${APP_NAME}


FROM node:22-alpine AS production

ARG APP_NAME
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.json
COPY apps/${APP_NAME}/package.json apps/${APP_NAME}/package.json

RUN npm install -g pnpm

RUN pnpm install --prod --frozen-lockfile

COPY --from=development /usr/src/app/dist ./dist
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

CMD sh -c "exec node dist/apps/${APP_NAME}/main"
