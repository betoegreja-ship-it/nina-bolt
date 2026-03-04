#!/bin/bash

set -e

echo "🚀 Iniciando deploy do Egreja Investment AI PRO no Railway..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verificar arquivo dist.tar.gz
if [ ! -f "dist.tar.gz" ]; then
    echo -e "${RED}❌ Erro: dist.tar.gz não encontrado!${NC}"
    echo "Peça ao Manus para: tar -czf dist.tar.gz dist/"
    exit 1
fi

echo -e "${BLUE}Step 1: Extraindo /dist...${NC}"
tar -xzf dist.tar.gz
echo -e "${GREEN}✅ /dist extraído${NC}"
echo ""

# Step 2: Verificar Railway CLI
echo -e "${BLUE}Step 2: Verificando Railway CLI...${NC}"
if ! command -v railway &> /dev/null; then
    echo "Instalando Railway CLI..."
    npm install -g @railway/cli
fi
echo -e "${GREEN}✅ Railway CLI pronto${NC}"
echo ""

# Step 3: Criar package.json (se não existir)
echo -e "${BLUE}Step 3: Preparando package.json...${NC}"
if [ ! -f "package.json" ]; then
    cat > package.json << 'EOF'
{
  "name": "egreja-dashboard",
  "version": "1.0.0",
  "description": "Egreja Investment AI PRO - Frontend",
  "scripts": {
    "serve": "serve -s dist -l 3000"
  },
  "dependencies": {
    "serve": "^14.0.0"
  }
}
EOF
fi
echo -e "${GREEN}✅ package.json pronto${NC}"
echo ""

# Step 4: Criar Dockerfile
echo -e "${BLUE}Step 4: Preparando Dockerfile...${NC}"
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY dist /app/dist
COPY package.json /app/

RUN npm install -g serve

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["serve", "-s", "dist", "-l", "3000"]
EOF
echo -e "${GREEN}✅ Dockerfile pronto${NC}"
echo ""

# Step 5: Criar railway.json
echo -e "${BLUE}Step 5: Preparando railway.json...${NC}"
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "always",
    "restartPolicyMaxRetries": 10
  }
}
EOF
echo -e "${GREEN}✅ railway.json pronto${NC}"
echo ""

# Step 6: Railway Init & Deploy
echo -e "${BLUE}Step 6: Autenticando no Railway...${NC}"
railway login || true

echo -e "${BLUE}Step 7: Iniciando projeto Railway...${NC}"
railway init -n egreja-dashboard

echo -e "${BLUE}Step 8: Fazendo deploy...${NC}"
railway up

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Aguarde ~5 minutos pro Railway buildar"
echo "2. Vá em: https://railway.app"
echo "3. Projeto 'egreja-dashboard' → Settings → Domains"
echo "4. Adicione: www.egreja.com"
echo "5. Railway vai gerar um CNAME"
echo "6. No seu registrador (Namecheap/GoDaddy), aponte:"
echo "   www → CNAME → [valor do Railway]"
echo "7. Espere 5-10 min pro SSL"
echo "8. Pronto! www.egreja.com estará live 🎉"
