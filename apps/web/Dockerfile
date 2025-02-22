# should run from the root of the project, e.g. ../../

FROM node:20-alpine

ENV DOCKER_ENV=true

RUN apk add --no-cache postgresql-client
RUN npm install -g pnpm
RUN pnpm i next

WORKDIR /app
RUN mkdir -p apps/web

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY node_modules/ node_modules/
COPY packages/ packages/
COPY apps/web apps/web
COPY .env.local .env.local
COPY .env.production .env.production
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/web

EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]
