# Checklist Pre-Deploy — O que fazer antes de ir ao ar

## CRITICO (bloqueia deploy)

### 1. JWT_SECRET hardcoded — FEITO
~~O arquivo `server/src/middleware/auth.ts` tem um fallback em texto puro.~~

**O que foi feito:**
- Removido o fallback — servidor não inicia sem `JWT_SECRET`
- Gerado secret forte de 128 caracteres no `.env`
- Criado `.gitignore` para proteger `.env`

---

### 2. Migrar de SQLite para PostgreSQL — FEITO
~~SQLite nao suporta acessos concorrentes de forma confiavel.~~

**O que foi feito:**
- Provider trocado para `postgresql` no `schema.prisma`
- No Railway, basta adicionar o servico PostgreSQL e linkar
- Rodar `npx prisma db push` apos o primeiro deploy para criar as tabelas

---

### 3. HTTPS obrigatorio — FEITO (Railway fornece automaticamente)
~~Sem HTTPS, tokens JWT e senhas trafegam em texto puro.~~

**O que foi feito:**
- Railway fornece HTTPS automatico em todos os dominios `.up.railway.app`
- Se mudar de host, configurar Nginx/Caddy com Let's Encrypt

---

### 4. Rate limiting no login — FEITO

**O que foi feito:**
- Instalado `express-rate-limit`
- Login limitado a 5 tentativas por IP a cada 15 minutos
- Rate limiter global de 100 req/min por IP em todas as rotas `/api`
- Retorna 429 com mensagem em portugues

---

### 5. Proteger criacao do SUPER_ADMIN — FEITO

**O que foi feito:**
- Rotas `/api/auth/register`, `/api/users` (POST e PUT) bloqueiam role SUPER_ADMIN
- Schemas Zod so aceitam ADMIN, MANAGER, SELLER — SUPER_ADMIN rejeitado na validacao
- Rota do Super Admin (`/api/super-admin/companies/:id/users`) tambem bloqueia SUPER_ADMIN

---

## IMPORTANTE (resolve logo apos o deploy)

### 6. Backup automatizado — PENDENTE (infraestrutura)
Se o servidor cair ou o disco falhar, perde-se todos os dados.

**O que fazer no deploy:**
- Com PostgreSQL: `pg_dump` agendado via cron (diario no minimo)
- Armazenar backups em local separado (S3, Google Cloud Storage)
- Testar restauracao periodicamente

---

### 7. Validacao robusta de input — FEITO

**O que foi feito:**
- Criado `server/src/utils/validation.ts` com schemas Zod centralizados
- Validacao aplicada em: login, register, criar usuario, atualizar usuario, trocar senha
- Emails validados como email real, senhas validadas com politica forte
- Campos com tamanho maximo definido

---

### 8. Logs estruturados e observabilidade — PENDENTE (pos-deploy)
Em producao, `console.log` e `console.error` nao sao suficientes.

**O que fazer apos deploy:**
- Usar uma lib de logging (pino, winston)
- Log em formato JSON com timestamp, request ID, user ID
- Monitorar erros com Sentry ou similar
- Metricas basicas: latencia de requests, taxa de erros

---

### 9. Politica de senha mais forte — FEITO

**O que foi feito:**
- Minimo 8 caracteres (era 6)
- Exigido pelo menos 1 numero e 1 letra
- Validacao aplicada via Zod em todos os endpoints que aceitam senha
- Rota do Super Admin tambem atualizada

---

### 10. CORS restrito — FEITO

**O que foi feito:**
- CORS agora le da variavel de ambiente `CORS_ORIGIN`
- Se `CORS_ORIGIN` estiver definida, usa so ela (ex: `CORS_ORIGIN=https://meucrm.com`)
- Se nao estiver definida (dev), usa localhost como antes
- Suporta multiplas origens separadas por virgula

---

## BOM TER (antes de escalar)

### 11. Upload de arquivos em cloud storage
Avatares e anexos nao devem ficar no filesystem do servidor.

### 12. Email de recuperacao de senha
Hoje nao ha como recuperar senha sem acesso ao banco.

### 13. Limites por plano
Maximo de leads, usuarios e armazenamento por empresa. Niveis de plano (free, pro, enterprise).

### 14. Deploy containerizado (Docker)
Dockerfile + docker-compose para facilitar deploy e reproducibilidade.

### 15. Dominio/subdominio por empresa
Cada empresa com URL propria (empresa1.seucrm.com).
