FROM node:20-slim

# Instala as dependências do sistema para o Chromium
RUN apt-get update && \
    apt-get install -y \
    chromium \
    fonts-liberation \
    libglib2.0-0 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    xdg-utils

# Define variáveis de ambiente
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Configura o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Compila o projeto
RUN npm run build

# Comando de inicialização
CMD ["npm", "start"]
