# Egreja Investment AI PRO - Deploy Railway

## Status

```
Frontend Build: ✅ Concluído (dist/ pronto)
Backend: ✅ Rodando no Manus
BD: ✅ MySQL Manus
```

## O que precisa acontecer

**Hoje (23:13):**
1. Manus compacta: `tar -czf dist.tar.gz dist/`
2. Arquivo `dist.tar.gz` chega pra mim
3. Eu rodo `./setup-and-deploy.sh`
4. Railway faz build e deploy (20-30 min)
5. Você aponta DNS (5 min)
6. **PRONTO!** www.egreja.com live

## Arquivos Inclusos

```
egreja-railway/
├── setup-and-deploy.sh  ← Script que faz TUDO (quando dist.tar.gz chegar)
├── package.json         ← Config Node.js
├── Dockerfile           ← Containerização
├── railway.json         ← Config Railway
├── .gitignore           ← Ignora builds locais
└── README.md            ← Este arquivo
```

## Como Rodar

### Quando receber dist.tar.gz do Manus:

```bash
cd egreja-railway/
chmod +x setup-and-deploy.sh
./setup-and-deploy.sh
```

Isso vai:
- ✅ Extrair `/dist`
- ✅ Instalar Railway CLI
- ✅ Criar config files
- ✅ Fazer login no Railway (você clica no browser)
- ✅ Deploy automático
- ✅ Gerar URL pública

### Quando terminar:

Railway vai exibir algo como:
```
✨ Deployment successful!
Your app is live at: https://egreja-dashboard-xxx.railway.app
```

## Próximo: Configurar Domínio

1. **Dashboard Railway:**
   - Acesse: https://railway.app
   - Projeto: egreja-dashboard
   - Settings → Domains
   - "Add Custom Domain"
   - Digite: `www.egreja.com`

2. **Railway gera um CNAME:**
   ```
   CNAME: xxxx.railway.app
   ```

3. **Seu registrador (Namecheap/GoDaddy):**
   - DNS Records
   - Name: `www`
   - Type: `CNAME`
   - Value: `[CNAME do Railway]`
   - TTL: 3600
   - Save

4. **Espere:**
   - DNS: 5-10 min
   - SSL: 5-10 min
   - Total: ~15 min

5. **Teste:**
   ```bash
   curl https://www.egreja.com
   # Ou acesse no browser
   ```

## Variáveis de Ambiente (se necessário)

Se o frontend precisar de env vars (API backend URL, etc):

```bash
railway variable add VITE_BACKEND_URL=https://seu-backend.manus.com
railway variable add VITE_API_KEY=xxxxx
```

## Logs & Monitoramento

```bash
# Ver logs em tempo real
railway logs

# Redeploy
railway up

# Ver variáveis
railway variable list

# Ver status
railway status
```

## Troubleshooting

### Build falhando?
```bash
railway logs
# Ver o erro específico
```

### Port error?
Railway já configura `PORT=3000` automaticamente. Dockerfile usa isso.

### DNS não funciona?
- Esperar até 48h
- Verificar CNAME com: `nslookup www.egreja.com`

### SSL error?
- Esperar 10-15 min depois de apontar DNS
- Railway usa Let's Encrypt (grátis e automático)

## Custos

Railway oferece:
- **Tier Free:** $5/mês crédito (normalmente é o suficiente)
- **Tier Hobby:** $5+/mês conforme uso
- Você vê em real-time no dashboard

Para este projeto (simples React estático):
- **Estimado:** $2-3/mês

## Suporte

Qualquer problema:
1. `railway logs` → ver o erro
2. Contate Railway: https://railway.app/support
3. Ou volte comigo (Nina) aqui no chat

---

**Status:** Aguardando `dist.tar.gz` do Manus. Assim que chegar, é 30 min e pronto! 🚀
