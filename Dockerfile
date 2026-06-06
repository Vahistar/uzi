FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

VOLUME ["/app/data"]

ENV APP_PORT=3000
ENV APP_HOST=0.0.0.0
ENV APP_DB_PATH=/app/data/scripts.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
