# should run from the root of the project, e.g. ../../

FROM node:20-alpine

ENV DOCKER_ENV=true

RUN npm install -g pnpm
RUN pnpm i next

WORKDIR /app
RUN mkdir -p apps/web

COPY ./ ./

WORKDIR /app/apps/web

EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]
