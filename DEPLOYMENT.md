# Deploy Egreja Dashboard - Railway via GitHub

## Status ✅

```
[✅] /dist extraído (501 KB)
[✅] Dockerfile pronto
[✅] railway.json configurado
[✅] package.json criado
[✅] GitHub Actions config pronto
[🎯] Aguardando: Push pro GitHub + conectar Railway
```

## Próximos Passos (15 min)

### 1️⃣ Criar Repo GitHub (2 min)

```bash
cd /Users/betoegreja/.openclaw/workspace/egreja-railway

# Inicializar git
git init
git add .
git commit -m "Initial commit: Egreja Dashboard deployment"

# Criar repo no GitHub
# 1. Acesse: https://github.com/new
# 2. Nome: egreja-dashboard-railway
# 3. Descrição: Egreja Investment AI PRO Frontend
# 4. Public (pra Railway conseguir acessar)
# 5. Criar!

# Depois, adicionar remote e fazer push:
git remote add origin https://github.com/SEU_USUARIO/egreja-dashboard-railway.git
git branch -M main
git push -u origin main
```

### 2️⃣ Conectar Railway ao GitHub (3 min)

1. Acesse: https://railway.app
2. Login (você já tem conta)
3. "New Project" → "Deploy from GitHub"
4. Autorizar GitHub (click em "Connect GitHub")
5. Selecionar repo: `egreja-dashboard-railway`
6. Clicar "Deploy"

Railway vai automaticamente:
- ✅ Buildenvio do Dockerfile
- ✅ Deploy do `/dist`
- ✅ Gerar URL pública (tipo: egreja-dashboard-xxx.railway.app)

### 3️⃣ Configurar Domínio (5 min)

Em Railway (depois que deploy terminar):

1. Dashboard → Project → Seu serviço
2. "Settings" → "Custom Domain"
3. Clicar "Add Custom Domain"
4. Digitar: `www.egreja.com`
5. Railway vai gerar um **CNAME**

No Namecheap (seu registrador):

1. Acesse: namecheap.com → Dashboard
2. "Manage" no domínio `egreja.com`
3. "Advanced DNS"
4. Adicionar record:
   - **Host:** `www`
   - **Type:** `CNAME Record`
   - **Value:** `[CNAME do Railway]`
   - **TTL:** `3600`
5. Salvar

### 4️⃣ Esperar & Testar (10 min)

```
- DNS propagar: 5-10 min
- SSL ativar (Let's Encrypt): 5-10 min
- Total: ~15 min
```

Depois, testar:
```bash
curl https://www.egreja.com
# Ou acesse no browser
```

## Custos

Railway oferece **$5/mês de crédito grátis**.

Este projeto (React estático + serve):
- **Estimado:** $2-3/mês
- **Você paga:** Nada (dentro do crédito grátis)

## Troubleshooting

### Railway não consegue buildar?
```
Verificar logs em Railway Dashboard → Logs
```

### DNS não funciona?
```
Esperar até 48h (DNS global)
Testar com: nslookup www.egreja.com
```

### SSL erro?
```
Esperar 10-15min depois de apontar DNS
Railway usa Let's Encrypt automático
```

## Estrutura Final

```
GitHub (egreja-dashboard-railway)
  ↓
Railway (auto-deploy do GitHub)
  ↓
egreja-dashboard-xxx.railway.app
  ↓
www.egreja.com (via CNAME)
```

---

**Pronto pra começar?** Avisa quando fizer o commit no GitHub que eu monitoro o resto! 🚀
