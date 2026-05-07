FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json ./lib/db/package.json
COPY lib/db/tsconfig.json ./lib/db/tsconfig.json
COPY lib/db/drizzle.config.ts ./lib/db/drizzle.config.ts

COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json

COPY artifacts/discord-bot/package.json ./artifacts/discord-bot/package.json
COPY artifacts/discord-bot/tsconfig.json ./artifacts/discord-bot/tsconfig.json

RUN pnpm install --filter @workspace/discord-bot...

COPY lib/ ./lib/
COPY artifacts/discord-bot/ ./artifacts/discord-bot/

RUN pnpm --filter @workspace/discord-bot run build

CMD ["node", "--enable-source-maps", "/app/artifacts/discord-bot/dist/index.mjs"]
