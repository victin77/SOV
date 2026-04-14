# RELATORIO DE CORRECOES - CRM Leads

**Data:** 2026-04-13
**Origem:** Correcoes aplicadas a partir dos relatorios do Cipher e do Carlos

## Correcoes principais

- Removidas credenciais hardcoded do Super Admin em `bootstrap.ts` e `create-super-admin.ts`.
- Removido fallback hardcoded da chave de criptografia em `secrets.ts`.
- Refeito o middleware de autenticacao para validar usuario/role/empresa no banco a cada request.
- Migrada a sessao do frontend para cookies httpOnly, mantendo limpeza de tokens antigos do `localStorage`.
- Reduzido token de impersonation para 1 hora e removida confianca direta em `impersonating`/`originalUserId` do JWT.
- Corrigida captura publica de leads com `companySlug` obrigatorio, empresa ativa, `companyId` em Lead/Activity, rate limit e honeypot.
- Adicionado controle de role em tags e bulk update de leads.
- Restringido SELLER a visualizar/alterar/excluir apenas dados proprios em leads e appointments.
- Validado `assignedToId`, `stageId` e tags dentro da mesma empresa antes de criar/atualizar leads.
- Adicionado audit log no delete de usuarios e protecao contra excluir/remover o ultimo ADMIN ativo.
- Alinhada validacao de senha no backend e frontend: minimo 8 caracteres, 1 letra e 1 numero.
- Adicionada validacao segura para avatar do perfil.
- Adicionados security headers via `helmet` e CORS obrigatorio em producao.
- Centralizado `PrismaClient` em singleton para evitar multiplas instancias runtime.
- Substituido pacote `xlsx` vulneravel por `exceljs`; `npm audit --audit-level=high` ficou limpo.
- Corrigidas mensagens com caracteres corrompidos detectadas no QA.

## Verificacoes executadas

- `npm run build --prefix server`: passou.
- `npm run build --prefix client`: passou, com aviso de chunk grande do Vite.
- `npm audit --audit-level=high --prefix server`: passou, 0 vulnerabilidades.
- `npm audit --audit-level=high --prefix client`: passou, 0 vulnerabilidades.
- `git diff --check`: passou, apenas avisos de CRLF/LF do Git no Windows.
- Busca por credenciais antigas e tokens em `localStorage`: sem ocorrencias relevantes.

## Pontos para QA revisar

- Forms externos de captura agora precisam enviar `companySlug`.
- O fluxo de login/refresh/logout agora depende de cookies httpOnly.
- O fluxo de entrar/sair de empresa como Super Admin usa cookie de impersonation de 1 hora.
- Import/export `.xlsx` foi migrado para `exceljs`; validar com arquivos reais de clientes.
