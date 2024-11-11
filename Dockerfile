# Этап сборки
FROM node:18-alpine as build-stage
# Устанавливаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем остальные файлы проекта
COPY . .

# Очищаем и собираем проект
RUN pnpm run build

# Этап продакшена
FROM nginx:stable-alpine as production-stage
# Копируем собранные файлы из предыдущего этапа
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
