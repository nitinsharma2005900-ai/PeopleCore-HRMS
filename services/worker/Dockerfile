FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci
COPY services/worker services/worker
RUN npx tsc services/worker/worker.ts --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --outDir services/worker/dist
ENV NODE_ENV=production
USER node
CMD ["node", "services/worker/dist/worker.js"]
