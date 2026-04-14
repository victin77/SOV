# RELATORIO DE QA - CRM Leads Multi-Tenant

**Data:** 2026-04-12
**QA Engineer:** Carlos

---

## BUGS CRITICOS (2)

### BUG-001: Rota /api/capture/lead sem isolamento multi-tenant
- **Arquivo:** `server/src/routes/capture.ts`
- Leads criados sem companyId, ficam orfaos no banco

### BUG-002: Delete de usuario (users.ts) nao grava audit log
- **Arquivo:** `server/src/routes/users.ts`
- Exclusao permanente sem rastro na auditoria

---

## BUGS ALTOS (4)

### BUG-003: Seller pode deletar leads de qualquer colega
- **Arquivo:** `server/src/routes/leads.ts` DELETE /:id
- Sem verificacao de ownership para SELLER

### BUG-004: Seller pode criar leads atribuidos a qualquer usuario
- **Arquivo:** `server/src/routes/leads.ts` POST /
- assignedToId aceito sem validacao

### BUG-005: MANAGER acessa pagina de usuarios sem poder agir
- **Arquivo:** `client/src/pages/UsersPage.tsx`
- Acessa a tela mas sem nenhum botao de acao

### BUG-006: Validacao de senha inconsistente frontend/backend
- Frontend aceita 6 chars, backend exige 8 + letra + numero

---

## BUGS MEDIOS (6)

- BUG-007: Tags sem restricao de role
- BUG-008: Select de role mostra SUPER_ADMIN como opcao
- BUG-009: Seller pode deletar appointments de outros
- BUG-010: Bulk update sem verificacao de role
- BUG-011: authorizeSuperAdmin confia em campo originalUserId
- BUG-012: Activity de captura criada sem companyId

---

## BUGS BAIXOS (5)

- BUG-013: Caracteres corrompidos em mensagens de erro (Usuario)
- BUG-014: Falta try/catch no handleDelete do UsersPage
- BUG-015: authorize() - campo impersonating redundante
- BUG-016: Empresa pode ser deletada enquanto impersonated
- BUG-017: Sem protecao contra deletar ultimo ADMIN da empresa

---

## O QUE PASSOU

- Login/logout, refresh tokens, multi-tenancy basico
- Impersonation completa, delete em cascata
- Pipeline kanban, import/export, WhatsApp multi-tenant
- Dashboard por role, rate limiting, roteamento frontend
