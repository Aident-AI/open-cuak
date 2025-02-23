# Use a Debian-based Node image for compatibility
FROM node:20-bullseye-slim

ENV DOCKER_ENV=true

# Install dependencies
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        python3 \
        python3-pip \
        python3-venv \
        make \
        g++ \
        postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/bin/python3 /usr/bin/python
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/web apps/web
COPY patches/ patches/
COPY .env.local .env.local
COPY .env.production .env.production

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/web

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
