# Многоэтапная сборка (multi-stage build):
# 1) этап "build" — ставит node_modules и собирает статические файлы
#    (HTML/CSS/JS), сам Node.js в финальном образе не нужен;
# 2) финальный этап — образ Caddy, который просто отдаёт эти готовые
#    файлы и умеет проксировать запросы к бэкенду (см. Caddyfile).
# В итоге финальный образ маленький и не содержит Node.js вообще.

FROM node:22-alpine AS build

WORKDIR /app

# Сначала только package*.json — тот же трюк с кешем слоёв, что и в
# backend/Dockerfile: npm install пересобирается только если реально
# менялись зависимости.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL "зашивается" в собранный JS на этапе сборки (Vite так
# устроен — в отличие от бэкенда, эту переменную нельзя поменять
# после сборки образа простым перезапуском контейнера).
# "/api" — относительный путь: фронтенд обращается по тому же
# домену, на котором сам открыт, а Caddy уже перенаправляет /api/*
# на бэкенд (см. Caddyfile). Поэтому один и тот же собранный образ
# работает и на localhost, и на любом реальном домене — пересборка
# при покупке/смене домена не нужна.
ENV VITE_API_URL=/api

RUN npm run build

FROM caddy:2-alpine

COPY --from=build /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
