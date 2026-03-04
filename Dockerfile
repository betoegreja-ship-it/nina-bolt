FROM node:20-alpine

WORKDIR /app

# Copiar apenas package.json necessário
COPY package.json /app/

# Instalar dependências
RUN npm install --production

# Copiar React build
COPY dist /app/dist

EXPOSE 3000

# Executar serve diretamente (sem npm intermediário)
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
