# Deploy — CRM Leads

## Hospedagem atual: Railway

Preparado em 2026-04-10. Se mudar de hospedagem no futuro, veja a secao "O que e especifico do Railway" no final.

---

## O que foi feito para preparar o deploy

### 1. Banco de dados: SQLite → PostgreSQL
- `server/prisma/schema.prisma`: provider trocado de `sqlite` para `postgresql`
- Nenhuma query precisou mudar — Prisma abstrai as diferencas
- No Railway, adicionar um servico PostgreSQL e linkar ao app (ele injeta `DATABASE_URL` automaticamente)

### 2. Frontend servido pelo backend
- `server/src/index.ts` agora serve os arquivos estaticos de `client/dist`
- Qualquer rota que nao seja `/api/*` retorna o `index.html` (SPA routing)
- Isso permite usar **1 unico service** no Railway (backend + frontend juntos)

### 3. Scripts de build
- `package.json` raiz:
  - `postinstall`: instala dependencias do server e client automaticamente
  - `build`: gera Prisma Client + compila TS do server + builda o frontend
  - `start`: roda `node dist/index.js` no server

### 4. CORS configuravel
- `CORS_ORIGIN` define as origens permitidas (ex: `https://meucrm.com`)
- Se nao definida, usa localhost (modo dev)
- Como frontend e backend estao no mesmo dominio no Railway, CORS nao e necessario em producao

### 5. JWT_SECRET obrigatorio
- Servidor nao inicia sem `JWT_SECRET` definida
- Gerar um secret forte: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## Variaveis de ambiente no Railway

| Variavel | Obrigatoria | Exemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Sim | (Railway preenche automaticamente ao linkar o PostgreSQL) |
| `JWT_SECRET` | Sim | (gerar com o comando acima) |
| `PORT` | Nao | Railway define automaticamente |
| `CORS_ORIGIN` | Nao | Nao precisa se frontend e backend estao no mesmo dominio |

---

## Passo a passo no Railway

1. Criar conta em railway.app
2. Criar novo projeto
3. **Adicionar PostgreSQL**: New Service → Database → PostgreSQL
4. **Adicionar o app**: New Service → GitHub Repo (ou CLI)
5. **Linkar o banco**: clicar no service do app → Variables → Add Reference Variable → selecionar `DATABASE_URL` do PostgreSQL
6. **Adicionar variaveis**: na aba Variables do app:
   - `JWT_SECRET` = (gerar um novo, forte)
7. **Configurar build/start** (se Railway nao detectar automaticamente):
   - Build Command: `npm run build`
   - Start Command: `npm run start`
8. **Criar as tabelas**: depois do primeiro deploy, rodar no terminal do Railway:
   ```
   cd server && npx prisma db push
   ```
9. **Criar o SUPER_ADMIN**: rodar no terminal do Railway:
   ```
   cd server && SUPER_ADMIN_EMAIL=seu@email.com SUPER_ADMIN_PASSWORD=SuaSenha123 npm run create-super-admin
   ```
   Ou sem variaveis (usa `super@crm.com` / `SuperAdmin1` como padrao — troque a senha depois)

10. Acessar o dominio gerado pelo Railway (ex: `crm-leads-production.up.railway.app`)

---

## O que e especifico do Railway (se mudar de hospedagem)

Quase nada. O codigo em si e generico. O que voce precisa adaptar:

1. **DATABASE_URL**: qualquer PostgreSQL funciona. Basta configurar a variavel de ambiente com a connection string do novo banco
2. **PORT**: alguns hosts (Render, Fly, etc.) tambem injetam `PORT` automaticamente. O codigo ja le de `process.env.PORT`
3. **Build/Start**: os scripts `npm run build` e `npm run start` funcionam em qualquer lugar
4. **HTTPS**: Railway fornece automaticamente. Em outro host, pode ser necessario configurar Nginx/Caddy com Let's Encrypt
5. **Prisma db push**: precisa rodar uma vez para criar as tabelas no novo banco

Em resumo: a unica coisa que muda entre hosts e **onde voce configura as variaveis de ambiente** e **como provisiona o PostgreSQL**.

---

## Verificacoes pos-deploy

- [ ] App abre no navegador
- [ ] Tela de login aparece
- [ ] Consegue criar o SUPER_ADMIN e logar
- [ ] Consegue criar uma empresa e um usuario ADMIN
- [ ] Leads, pipeline, dashboard funcionam
- [ ] Importacao de XLSX funciona
- [ ] HTTPS esta ativo (cadeado no navegador)
