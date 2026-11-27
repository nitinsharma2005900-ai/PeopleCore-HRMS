FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci
COPY apps/frontend apps/frontend
RUN npm run build -w apps/frontend
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["npm", "start", "-w", "apps/frontend"]
