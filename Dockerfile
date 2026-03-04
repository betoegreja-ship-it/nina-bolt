FROM node:20-alpine

WORKDIR /app

COPY dist /app/dist
COPY package.json /app/

RUN npm install -g serve

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
