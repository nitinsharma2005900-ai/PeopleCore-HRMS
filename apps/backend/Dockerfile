FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci
COPY database database
COPY apps/backend apps/backend
RUN npm run db:generate && npm run build -w apps/backend
ENV NODE_ENV=production
USER node
EXPOSE 5000
CMD ["sh", "-c", "npm run db:migrate && node apps/backend/dist/server.js"]
