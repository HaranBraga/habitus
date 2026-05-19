# Stage 1: build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: build backend
FROM node:20-alpine AS backend-builder
RUN apk add --no-cache openssl
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/ .
RUN npm run build

# Final stage: nginx + node via supervisord
FROM node:20-alpine
RUN apk add --no-cache nginx supervisor openssl

WORKDIR /app

# Backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./prisma
COPY backend/package.json ./package.json

# Frontend
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Supervisor
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
