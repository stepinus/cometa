# Этап клонирования репозитория с последней версией
FROM alpine/git as clone-stage
WORKDIR /app
ADD https://www.google.com /time.now
RUN git clone https://github.com/stepinus/cometa.git .

FROM node:18-alpine as build-stage

# Устанавливаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Копируем файлы из этапа клонирования
COPY --from=clone-stage /app .

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Создаем .env файл со всеми переменными окружения
RUN echo "VITE_APP_OPENAI_API_BASE=https://api.vsegpt.ru/v1/" > .env && \
    echo "VITE_APP_OPENAI_API_BASE2=https://api.vsegpt.ru/v1/" >> .env && \
    echo "VITE_APP_OPENAI_API_KEY2=sk-or-vv-5079af64d63ecffa01709d6f64e1255aa4c54faad180bccaee4c9403233c8833" >> .env && \
    echo "VITE_APP_OPENAI_API_KEY=sk-or-vv-5079af64d63ecffa01709d6f64e1255aa4c54faad180bccaee4c9403233c8833" >> .env && \
    echo "VITE_APP_COMETA_API_KEY=sk-or-vv-5079af64d63ecffa01709d6f64e1255aa4c54faad180bccaee4c9403233c8833" >> .env && \
    echo "VITE_APP_DEEPGRAM_API_KEY=38867a88da1a6a76053657528014b8825bbe4f93" >> .env && \
    echo "VITE_APP_SALUTE=Y2MwMzNjYTktYzM4MS00ODQyLThkZTctODJjZjUzOTllOTI0OjViMDRlMWRlLTUxMGQtNGI2Zi04YTcwLTQ0NThmYWZmNzRlOQ==" >> .env && \
    echo "VITE_OAUTH_API_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth" >> .env && \
    echo "VITE_RECOGNIZE_API_URL=https://smartspeech.sber.ru/rest/v1/speech:recognize" >> .env && \
    echo "VITE_APP_MODEL=anthropic/claude-3-haiku" >> .env

RUN rm -rf dist
RUN pnpm run build

# Этап продакшена
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /app

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]