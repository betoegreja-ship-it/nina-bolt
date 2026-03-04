FROM node:20-alpine

WORKDIR /app

# Copiar apenas o dist (não o index.js antigo)
COPY dist /app/dist

# Instalar serve globalmente
RUN npm install -g serve@14.0.0

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Servir apenas o dist (React build)
CMD ["serve", "-s", "dist", "-l", "3000"]
