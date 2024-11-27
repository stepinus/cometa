# Этап клонирования репозитория с последней версией
FROM alpine/git AS clone-stage
WORKDIR /app
ADD https://www.google.com /time.now
RUN git clone https://github.com/stepinus/cometa.git .

FROM node:18-alpine AS build-stage

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
    echo "VITE_APP_MODEL=anthropic/claude-3-5-haiku" >> .env

RUN rm -rf dist
RUN pnpm run build

# Копируем необходимые файлы моделей
RUN mkdir -p /app/models
RUN cp node_modules/@ricky0123/vad-web/dist/silero_vad.onnx /app/silero_vad.onnx
RUN cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js /app/vad.worklet.bundle.min.js

FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/silero_vad.onnx /app/silero_vad.onnx
COPY --from=build-stage /app/vad.worklet.bundle.min.js /app/vad.worklet.bundle.min.js
COPY --from=clone-stage /app/nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /app

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]