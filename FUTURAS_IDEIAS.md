# Futuras Ideias e Melhorias

## Seguranca

### Proteger criacao do SUPER_ADMIN
Hoje o super admin e criado por script direto no banco. Em producao, deveria ter:
- Um comando CLI protegido (`npm run create-super-admin`)
- Ou um seed inicial que so roda uma vez
- Variavel de ambiente com email/senha do primeiro super admin

### Rate limiting no login
Evitar brute force no endpoint de login:
- Limitar a 5 tentativas por IP a cada 15 minutos
- Limitar a 10 tentativas por email a cada 15 minutos
- Usar `express-rate-limit` ou similar
- Considerar captcha apos N tentativas falhas

### HTTPS em producao
- Configurar certificado SSL (Let's Encrypt)
- Redirecionar HTTP para HTTPS
- Cookies com flag `Secure`
- Headers de seguranca (HSTS, CSP, etc.)

## Funcionalidades futuras

### Limites por plano
- Maximo de leads por empresa
- Maximo de usuarios por empresa
- Maximo de armazenamento
- Niveis de plano (free, pro, enterprise)

### Dominio/subdominio por empresa
- Cada empresa com sua URL (empresa1.seucrm.com)
- Resolver empresa pelo subdominio no middleware
- Tela de login customizada por empresa

### Notificacoes do Super Admin
- Alerta quando empresa atinge limite de leads
- Resumo semanal de uso por empresa
- Notificacao quando nova empresa e criada

### Backup e exportacao por empresa
- Super admin pode exportar todos os dados de uma empresa
- Backup automatico diario
- Possibilidade de migrar dados entre empresas
