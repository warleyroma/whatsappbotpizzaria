# Use a imagem base do Node.js
FROM node:20-slim

# Instale as dependências do sistema para o Chromium
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

# Defina variáveis de ambiente
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Configure o diretório de trabalho
WORKDIR /app

# Copie os arquivos de dependência
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código
COPY . .

# Compile o projeto
RUN npm run build

# Comando de inicialização
CMD ["npm", "start"]
