# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install Python and other build dependencies
RUN apk add --no-cache python3 make g++ 

# Create python symlink
RUN ln -sf python3 /usr/bin/python

RUN npm install -g pnpm

WORKDIR /app

# Copy only the package files needed for installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
COPY packages/ packages/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder

ENV DOCKER_ENV=true

RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
COPY apps/web/ apps/web/

# Stage 3: Runner
FROM node:20-alpine AS runner

ENV DOCKER_ENV=true
ENV NODE_ENV=production

RUN npm install -g pnpm

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
