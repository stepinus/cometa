FROM node:18 as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN rm -rf dist
RUN npm run build

# Вывод содержимого папки dist в логи
RUN echo "Current directory: $(pwd)" && ls -la dist/assets

# Этап продакшена
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /app

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]