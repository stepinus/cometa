# Этап сборки
FROM node:18 as build-stage
RUN npm i -g pnpm
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN rm -rf dist
RUN pnpm run build

# Этап продакшена
FROM nginx:stable-alpine as production-stage
RUN npm i -g pnpm
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
