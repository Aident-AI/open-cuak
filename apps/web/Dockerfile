# Use a Debian-based Node image for compatibility
FROM node:20-bullseye

ENV DOCKER_ENV=true

# Install dependencies
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update --allow-releaseinfo-change && \
    apt-get install -y --fix-missing --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      python3 \
      python3-pip \
      make \
      g++ \
      postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN which python3 && ln -sf /usr/bin/python3 /usr/bin/python
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
