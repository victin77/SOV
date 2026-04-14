# RELATORIO DE AUDITORIA DE SEGURANCA - CRM Leads

**Data:** 2026-04-12
**Analista:** Cipher (Cybersecurity Specialist)

---

## VULNERABILIDADES CRITICAS (4)

### VULN-01: Credenciais Hardcoded do Super Admin
- **Arquivo:** `server/src/utils/bootstrap.ts`, `server/src/create-super-admin.ts`
- **Risco:** Sistema cria SUPER_ADMIN com `super@crm.com` / `SuperAdmin1` automaticamente
- **Impacto:** Qualquer pessoa tenta essas credenciais e ganha acesso total
- **Correcao:** Falhar se env vars nao estiverem definidas, nunca usar valores padrao

### VULN-02: Fallback de Encryption Secret Hardcoded
- **Arquivo:** `server/src/utils/secrets.ts`
- **Risco:** Chave `'crm-leads-local-encryption-secret'` usada se env var nao definida
- **Impacto:** Descriptografia trivial de todos os tokens WhatsApp
- **Correcao:** Falhar na inicializacao se APP_ENCRYPTION_SECRET nao definida

### VULN-03: Bypass de Autorizacao via campos JWT
- **Arquivo:** `server/src/middleware/auth.ts`
- **Risco:** Campo `impersonating` no JWT bypassa todos os role checks
- **Impacto:** Escalacao de privilegio total se JWT_SECRET vazar
- **Correcao:** Verificar role explicitamente, nao confiar em campos do payload

### VULN-04: Endpoint de Captura Publico sem Protecao
- **Arquivo:** `server/src/routes/capture.ts`
- **Risco:** Sem CAPTCHA, sem rate limit especifico, sem isolamento por empresa
- **Impacto:** Poluicao de dados, leads orfaos, DoS
- **Correcao:** Exigir companySlug, adicionar rate limit agressivo, validar inputs com Zod

---

## VULNERABILIDADES ALTAS (7)

### VULN-05: Bulk Update sem Validacao de Campos
- **Arquivo:** `server/src/routes/leads.ts` POST /bulk
- **Risco:** Aceita qualquer campo incluindo companyId
- **Correcao:** Whitelist de campos permitidos com Zod

### VULN-06: Cross-tenant no assignedToId
- **Arquivo:** `server/src/routes/leads.ts`
- **Risco:** Lead pode ser atribuido a usuario de outra empresa
- **Correcao:** Validar que assignedToId pertence a mesma empresa

### VULN-07: Tags sem Controle de Role
- **Arquivo:** `server/src/routes/tags.ts`
- **Risco:** SELLER pode criar/editar/deletar tags
- **Correcao:** Adicionar authorize('ADMIN', 'MANAGER')

### VULN-08: PUT /auth/profile sem Validacao
- **Arquivo:** `server/src/routes/auth.ts`
- **Risco:** Campo avatar aceita qualquer string (XSS potencial)
- **Correcao:** Validar com Zod, limitar tamanho dos campos

### VULN-09: Seed com Senhas Fracas
- **Arquivo:** `server/src/seed.ts`
- **Risco:** admin123, manager123, seller123 no codigo-fonte
- **Correcao:** Bloquear execucao em producao

### VULN-10: Tokens no localStorage
- **Arquivo:** `client/src/api/client.ts`
- **Risco:** Vulneravel a XSS (roubo de sessao)
- **Nota:** Correcao completa requer refactor significativo (cookies httpOnly)

### VULN-11: Token de Impersonation dura 7 dias
- **Arquivo:** `server/src/middleware/auth.ts`
- **Correcao:** Reduzir para 1 hora

---

## VULNERABILIDADES MEDIAS (8)

- VULN-12: CORS permissivo sem CORS_ORIGIN definida
- VULN-13: Rate limit de login so por IP, nao por email
- VULN-14: MANAGER pode criar usuario ADMIN via register
- VULN-15: Formulario de captura sem CSP headers
- VULN-16: Delete de empresa nao e transacional
- VULN-17: Audit log de delete executa depois de deletar logs
- VULN-18: Sem security headers (helmet)
- VULN-19: Multiplas instancias PrismaClient

---

## VULNERABILIDADES BAIXAS (5)

- VULN-20: Informacoes de erro expostas ao cliente
- VULN-21: XLSX import pode causar DoS
- VULN-22: Falta validacao Zod em muitos endpoints
- VULN-23: Refresh tokens expirados nao sao limpos
- VULN-24: Health check expoe timestamp
