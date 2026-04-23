# SOV CRM

CRM web multi-tenant para times comerciais. Gestão de leads, pipeline kanban, agenda de compromissos, integração com WhatsApp Business e controle de acesso por empresa.

## Stack

**Frontend** — React 18 + TypeScript + Vite + TailwindCSS + React Router
**Backend** — Node.js + Express 5 + Prisma + PostgreSQL
**Auth** — JWT (access + refresh) + Google OAuth + reset por email
**Email** — Resend (HTTP API)
**Deploy** — Railway (frontend e backend no mesmo serviço)

## Funcionalidades

- **Leads** — cadastro, listagem com filtros, atribuição, histórico de atividades
- **Pipeline** — kanban drag-and-drop com estágios customizáveis por empresa
- **Agenda** — compromissos vinculados a leads, lembretes
- **WhatsApp** — integração com WhatsApp Business Cloud API (webhook + envio)
- **Importação/Exportação** — Excel (xlsx) e CSV
- **Auditoria** — log de todas as ações sensíveis
- **Multi-tenant** — cada empresa enxerga apenas seus dados
- **Super Admin** — painel global com impersonação para suporte
- **Tags** — etiquetas customizáveis por empresa
- **Notificações** — push do navegador + lista in-app

## Estrutura

```
.
├── client/          Frontend React + Vite
├── server/          Backend Express + Prisma
│   ├── prisma/      Schema do banco
│   └── src/         Código do servidor
├── DEPLOY.md        Guia de deploy no Railway
└── DOCUMENTACAO.md  Manual do usuário final
```

## Como rodar local

### Pré-requisitos
- Node.js 20+
- PostgreSQL 15+

### 1. Clone e instale dependências
```bash
git clone https://github.com/victin77/SOV.git
cd SOV
cd server && npm install
cd ../client && npm install
```

### 2. Configure variáveis de ambiente

**`server/.env`**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/sov_crm
JWT_SECRET=troque-isso-em-producao
JWT_REFRESH_SECRET=troque-isso-tambem
APP_URL=http://localhost:5173
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=SOV CRM <onboarding@resend.dev>
SUPER_ADMIN_EMAIL=admin@exemplo.com
SUPER_ADMIN_PASSWORD=senha-inicial-forte
```

**`client/.env`**
```
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

### 3. Suba o banco e crie o super admin
```bash
cd server
npx prisma db push
npm run create-super-admin
```

### 4. Rode os dois lados
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Scripts úteis (server)

- `npm run dev` — desenvolvimento com hot reload
- `npm run build` — compila TypeScript pra `dist/`
- `npm start` — roda a versão buildada
- `npm run seed` — popula o banco com dados de exemplo
- `npm run create-super-admin` — cria o usuário super admin inicial
- `npm run migrate-existing-users` — migra usuários antigos pro novo modelo multi-tenant

## Deploy

Veja [`DEPLOY.md`](./DEPLOY.md) para instruções completas de deploy no Railway.

## Documentação do produto

Veja [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) para o manual de uso voltado ao usuário final.

## Licença

Veja [`LICENSE`](./LICENSE).
