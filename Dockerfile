# Frontend: build the React app, then serve it with nginx. nginx also proxies
# /api, /django-admin, /static, /media and /sitemap.xml to the Django backend,
# so the browser talks to one origin (needed for the httpOnly refresh cookie).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty means "same origin" - see src/api/client.js.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
