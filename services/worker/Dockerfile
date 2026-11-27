# Background Worker Dockerfile
FROM node:22-alpine

WORKDIR /app
COPY services/worker/package*.json ./
RUN npm install --only=production

COPY services/worker ./

CMD ["node", "-r", "ts-node/register", "worker.ts"]
