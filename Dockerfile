FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

RUN cd backend && npm install --omit=dev

COPY backend ./backend

COPY frontend ./frontend

RUN apk add --no-cache nginx \
    && mkdir -p /run/nginx \
    && mkdir -p /usr/share/nginx/html \
    && cp -r /app/frontend/. /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/http.d/default.conf

WORKDIR /app/backend

ENV PORT=5000

EXPOSE 80 5000

CMD ["sh", "-c", "node server.js & nginx -g 'daemon off;'"]