FROM node:18-alpine

# Устанавливаем git
RUN apk add --no-cache git

# Устанавливаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Клонируем репозиторий
RUN git clone https://github.com/stepinus/cometa.git .

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Добавляем express, http-proxy-middleware и dotenv
RUN pnpm add express http-proxy-middleware dotenv

# Создаем .env файл
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

# Собираем приложение
RUN pnpm run build

# Создаем package.json с type: module
RUN echo '{"type": "module"}' > package.json

# Копируем файл сервера
COPY server.js .

EXPOSE 3000
CMD ["node", "server.js"]