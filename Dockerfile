FROM node:20-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json /app/
RUN npm install

# Copiar build do React
COPY dist /app/dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Rodar usando npm start (que executa: serve -s dist -l 3000)
CMD ["npm", "start"]
