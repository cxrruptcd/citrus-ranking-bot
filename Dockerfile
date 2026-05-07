FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV npm_config_user_agent="pnpm/"

WORKDIR /app

# Copy workspace manifests first (for layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Only copy the packages the discord-bot actually depends on
COPY lib/db/package.json ./lib/db/package.json
COPY lib/db/tsconfig.json ./lib/db/tsconfig.json
COPY lib/db/drizzle.config.ts ./lib/db/drizzle.config.ts

COPY artifacts/discord-bot/package.json ./artifacts/discord-bot/package.json
COPY artifacts/discord-bot/tsconfig.json ./artifacts/discord-bot/tsconfig.json

# Install dependencies (discord-bot + its workspace deps)
RUN pnpm install --filter @workspace/discord-bot...

# Copy source
COPY lib/db/ ./lib/db/
COPY artifacts/discord-bot/ ./artifacts/discord-bot/

# Build
RUN pnpm --filter @workspace/discord-bot run build

CMD ["node", "--enable-source-maps", "/app/artifacts/discord-bot/dist/index.mjs"]
