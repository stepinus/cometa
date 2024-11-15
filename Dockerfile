# Этап клонирования репозитория с последней версией
FROM alpine/git as clone-stage
WORKDIR /app
RUN git clone --depth 1 https://github.com/stepinus/cometa.git .

# Этап сборки
FROM node:18-alpine

# Устанавливаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы из предыдущего этапа
COPY --from=clone-stage /app .

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Создаем .env файл со всеми переменными окружения
RUN echo "VITE_APP_OPENAI_API_BASE=https://api.aitunnel.ru/v1/" > .env && \
    echo "VITE_APP_OPENAI_API_BASE2=https://api.vsegpt.ru/v1/" >> .env && \
    echo "VITE_APP_OPENAI_API_KEY2=sk-or-vv-5079af64d63ecffa01709d6f64e1255aa4c54faad180bccaee4c9403233c8833" >> .env && \
    echo "VITE_APP_OPENAI_API_KEY=sk-aitunnel-R22Og9XWYQtelgNktlmJnd32moroJs3Z" >> .env && \
    echo "VITE_APP_COMETA_API_KEY=sk-d13c3a992a1248598d632d04e85e7641" >> .env && \
    echo "VITE_APP_DEEPGRAM_API_KEY=38867a88da1a6a76053657528014b8825bbe4f93" >> .env

# Открываем порт
EXPOSE 5173

# Команда запуска
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
