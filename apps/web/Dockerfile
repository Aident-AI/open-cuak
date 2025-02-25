# should run from the root of the project, e.g. ../../

# Stage 1: Dependencies
FROM node:20-bullseye-slim AS deps

RUN apt-get update && apt-get install -y \
  python3 \
  python-is-python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
COPY packages/ packages/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-bullseye-slim AS builder

ENV DOCKER_ENV=true

RUN npm install -g pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
COPY apps/web/ apps/web/

# Stage 3: Runner
FROM node:20-bullseye-slim AS runner

ENV DOCKER_ENV=true
ENV NODE_ENV=production

RUN npm install -g pnpm

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
