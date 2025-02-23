FROM ghcr.io/browserless/chromium:v2.21.1

ENV CONCURRENT=20
ENV DOCKER_ENV=true
ENV QUEUE=30
ENV TIMEOUT=900000
ENV NEXT_PUBLIC_BUILD_ENV=development

# Patch Browserless's dependency:
# 1. Update the puppeteer-core version in package.json
# 2. Remove the installed modules so that the patched version is installed on the next step
# 3. Reinstall production dependencies
RUN sed -i 's/"puppeteer-core": "\^23.4.1"/"puppeteer-core": "npm:rebrowser-puppeteer-core@^23.10.3"/g' /usr/src/app/package.json \
  && rm -rf /usr/src/app/node_modules \
  && cd /usr/src/app && npm install

RUN npm run install:debugger

WORKDIR /app
USER root
RUN npm install -g nodemon
RUN mkdir -p /app

COPY .env /app/.env
COPY .env.production /app/.env.production
COPY ./server /app/server
RUN chmod +x /app/server/scripts/start-ws-server.sh
RUN cd /app && npm install express socket.io rebrowser-puppeteer-core@^23.10.3 uuid axios

EXPOSE 3000
EXPOSE 11975
EXPOSE 50000

USER blessuser
CMD ["/app/server/scripts/start-ws-server.sh"]
