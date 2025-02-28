#####################
# Build arm64 image #
#####################
FROM --platform=linux/arm64 node:20-alpine AS runner-arm64

ENV DOCKER_ENV=true
ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache python3 make g++ 
RUN ln -sf python3 /usr/bin/python
RUN npm install -g pnpm

COPY ./ ./

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "start"]


#####################
# Build amd64 image #
#####################
FROM --platform=linux/amd64 node:20-alpine AS runner-amd64

ENV DOCKER_ENV=true
ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache python3 make g++ 
RUN ln -sf python3 /usr/bin/python
RUN npm install -g pnpm

COPY ./ ./

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "start"]
