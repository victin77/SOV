# CRM Leads — Documentacao do Sistema

Guia completo de como usar o CRM Leads. Escrito de forma simples pra qualquer pessoa conseguir usar, mesmo sem conhecimento tecnico.

---

## Sumario

1. [O que e o CRM Leads](#o-que-e-o-crm-leads)
2. [Niveis de acesso (quem pode o que)](#niveis-de-acesso)
3. [Primeiro acesso e login](#primeiro-acesso-e-login)
4. [Dashboard](#dashboard)
5. [Pipeline (Kanban)](#pipeline-kanban)
6. [Leads](#leads)
7. [WhatsApp](#whatsapp)
8. [Agenda (Compromissos)](#agenda)
9. [Etiquetas (Tags)](#etiquetas)
10. [Usuarios](#usuarios)
11. [Importar e Exportar](#importar-e-exportar)
12. [Auditoria](#auditoria)
13. [Notificacoes](#notificacoes)
14. [Configuracoes](#configuracoes)
15. [Painel do Super Admin](#painel-do-super-admin)
16. [Como configurar o WhatsApp](#como-configurar-o-whatsapp)
17. [Dicas de uso](#dicas-de-uso)

---

## O que e o CRM Leads

CRM Leads e um sistema de gestao comercial. Ele serve pra:

- **Organizar seus contatos** (leads) em um so lugar
- **Acompanhar o progresso** de cada negociacao pelo pipeline
- **Conversar com clientes** pelo WhatsApp direto do sistema
- **Agendar compromissos** e receber lembretes
- **Ver metricas** de desempenho da equipe no dashboard
- **Importar/exportar** dados em JSON ou Excel

O sistema e multi-empresa: cada empresa tem seus proprios dados completamente separados. Nenhuma empresa ve os dados de outra.

---

## Niveis de acesso

O sistema tem 4 niveis de usuario. Cada um pode fazer coisas diferentes:

| Nivel | O que pode fazer |
|---|---|
| **Vendedor (Seller)** | Ver e editar leads, usar pipeline, agendar compromissos, enviar WhatsApp, importar/exportar dados |
| **Gerente (Manager)** | Tudo do vendedor + gerenciar usuarios, ver auditoria |
| **Administrador (Admin)** | Tudo do gerente + configurar empresa, configurar WhatsApp, criar/desativar usuarios |
| **Super Admin** | Painel separado pra gerenciar todas as empresas, criar empresas, entrar no sistema de qualquer empresa |

### Quem deve usar cada nivel?

- **Vendedor**: consultores, SDRs, qualquer pessoa que trabalha diretamente com leads
- **Gerente**: coordenadores de equipe que precisam ver o time todo
- **Admin**: o dono ou responsavel tecnico da empresa
- **Super Admin**: voce (dono da plataforma), pra gerenciar todas as empresas

---

## Primeiro acesso e login

### Pra empresas novas
O Super Admin cria a empresa pelo painel. Ao criar, ele define o nome da empresa e os dados do primeiro administrador (nome, email, senha). Esse admin pode depois criar os demais usuarios.

### Pra usuarios novos
O Admin ou Gerente da empresa cria a conta do usuario em **Usuarios > Novo usuario**. O usuario recebe email e senha pra fazer login.

### Fazendo login
1. Acesse o endereco do sistema no navegador
2. Digite seu email e senha
3. Clique em "Entrar"

Se sua conta ou empresa estiver desativada, o login sera bloqueado.

---

## Dashboard

A primeira tela que voce ve ao entrar. Mostra um resumo de tudo:

- **Total de leads** — quantos contatos voce tem
- **Leads novos** — quantos entraram no periodo
- **Leads ganhos** — quantos fecharam negocio
- **Taxa de conversao** — porcentagem de leads que viraram clientes
- **Valor total** — soma dos valores dos negocios
- **Grafico de tendencia** — evolucao dos leads ao longo do tempo

### Filtros
Voce pode filtrar por periodo (hoje, esta semana, este mes, etc.) pra ver os numeros de diferentes intervalos.

### Dica
Olhe o dashboard todo dia de manha pra ter uma visao rapida de como esta o comercial.

---

## Pipeline (Kanban)

O pipeline e um quadro visual tipo Kanban (igual Trello). Cada coluna representa uma etapa da negociacao.

### Etapas padrao
Quando uma empresa e criada, o sistema ja vem com estas etapas:

1. **Novo** — lead acabou de chegar
2. **Contato** — primeiro contato feito
3. **Qualificacao** — entendendo se o lead tem perfil
4. **Proposta** — proposta enviada
5. **Negociacao** — em negociacao de valores/termos
6. **Fechamento** — negocio fechado

### Como usar

- **Arrastar e soltar**: clique em um lead e arraste pra outra coluna quando ele avancar de etapa
- **Criar etapas**: Admins podem criar novas etapas ou editar as existentes
- **Reordenar**: arraste as etapas pra mudar a ordem
- **Ver detalhes**: clique no lead pra ver todas as informacoes dele

### Dica
Mova os leads pelo pipeline conforme a negociacao avanca. Isso te da uma visao clara de onde cada oportunidade esta.

---

## Leads

Tela principal pra gerenciar todos os seus contatos/oportunidades.

### Criando um lead

1. Clique em **"+ Novo Lead"**
2. Preencha os dados:
   - **Nome** (obrigatorio)
   - **Email**
   - **Telefone**
   - **Empresa** do lead
   - **Cargo**
   - **Origem** (de onde veio: site, indicacao, etc.)
   - **Valor** estimado do negocio
   - **Prioridade** (Baixa, Media, Alta, Urgente)
   - **Responsavel** (quem vai atender esse lead)
   - **Etapa do pipeline**
3. Clique em **"Salvar"**

### Informacoes de um lead

Clicando num lead, voce ve:
- Dados de contato (email, telefone, empresa)
- Historico de atividades (ligacoes, reunioes, anotacoes)
- Etiquetas associadas
- Valor estimado e prioridade
- Status atual e etapa no pipeline

### Filtros e busca

- **Busca por nome** — digite o nome pra encontrar rapido
- **Filtro por status** — Novo, Contatado, Qualificado, Proposta, Negociacao, Ganho, Perdido
- **Filtro por prioridade** — Baixa, Media, Alta, Urgente
- **Filtro por responsavel** — ver leads de um consultor especifico
- **Filtro por data** — leads criados em determinado periodo

### Acoes em massa

Selecione varios leads de uma vez pra:
- Mudar status
- Mudar responsavel
- Aplicar etiquetas

### Dica
Use etiquetas pra categorizar leads (ex: "Indicacao", "Site", "Evento"). Filtros + etiquetas = encontrar qualquer lead em segundos.

---

## WhatsApp

O CRM tem integracao com WhatsApp pra voce conversar com leads sem sair do sistema.

### Como funciona

Existem 3 modos, dependendo da configuracao:

1. **Cloud API configurada** — mensagens vao e voltam direto pelo sistema. Voce envia e recebe tudo dentro do CRM.
2. **Fallback por variavel de ambiente** — o servidor usa uma config global se a empresa nao tiver a propria.
3. **Fallback por link** — se nada estiver configurado, o sistema abre o WhatsApp Web com a mensagem pronta pra voce enviar manualmente.

### Tela de conversas

No menu lateral, clique em **"WhatsApp"**. Voce vera:
- Lista de conversas com leads (lado esquerdo)
- Mensagens da conversa selecionada (lado direito)
- Campo pra digitar e enviar mensagens
- Busca pra encontrar conversas

### Enviando mensagem pela ficha do lead

Voce tambem pode enviar WhatsApp direto da pagina de detalhes de um lead, sem precisar ir na tela de conversas.

### Dica
Pra ter a melhor experiencia (enviar e receber mensagens dentro do CRM), configure a Cloud API do WhatsApp. Veja a secao [Como configurar o WhatsApp](#como-configurar-o-whatsapp).

---

## Agenda

Gerencie compromissos como reunioes, ligacoes e follow-ups.

### Criando um compromisso

1. Clique em **"+ Novo compromisso"**
2. Preencha:
   - **Titulo** (ex: "Reuniao com Joao")
   - **Data e hora de inicio**
   - **Data e hora de fim**
   - **Lead associado** (opcional, mas recomendado)
3. Salve

### Lembretes

O sistema te avisa automaticamente **1 hora antes** de cada compromisso com:
- Um **som de alerta**
- Um **toast na tela** (caixinha no canto superior direito)
- Uma **notificacao** salva no sino

### Dica
Sempre associe o compromisso a um lead. Assim voce tem o historico completo de interacoes com aquele contato.

---

## Etiquetas

Etiquetas sao "tags" coloridas que voce pode colocar nos leads pra organiza-los.

### Exemplos de uso

- **Origem**: "Site", "Indicacao", "Evento", "LinkedIn"
- **Segmento**: "Saude", "Tecnologia", "Varejo"
- **Temperatura**: "Quente", "Morno", "Frio"
- **Qualquer coisa** que faca sentido pro seu negocio

### Criando etiquetas

1. Va em **"Etiquetas"** no menu
2. Clique em **"+ Nova etiqueta"**
3. Escolha um nome e uma cor
4. Salve

### Aplicando etiquetas a um lead

Na ficha do lead, voce pode adicionar ou remover etiquetas.

### Dica
Nao exagere na quantidade de etiquetas. 5 a 10 categorias bem pensadas funcionam melhor que 50 etiquetas confusas.

---

## Usuarios

Somente **Admin** e **Gerente** podem acessar esta tela.

### Criando um usuario

1. Va em **"Usuarios"** no menu
2. Clique em **"+ Novo usuario"**
3. Preencha: nome, email, senha, cargo (Admin/Gerente/Vendedor), telefone
4. Salve

### Gerenciando usuarios

- **Editar**: mudar nome, cargo ou telefone
- **Desativar**: bloqueia o login do usuario sem apagar os dados dele
- **Reativar**: libera o acesso novamente

### Dica
Quando um vendedor sai da empresa, **desative** a conta dele em vez de apagar. Assim o historico de atividades e leads dele fica preservado.

---

## Importar e Exportar

Pra trazer dados de fora ou salvar um backup.

### Exportar

- **JSON** — arquivo de dados legivel por sistemas
- **Excel (XLSX)** — planilha que abre no Excel/Google Sheets

### Importar

1. Escolha o formato (JSON ou Excel)
2. Selecione o arquivo
3. O sistema mostra uma **previa** dos dados antes de importar
4. Confira se esta tudo certo
5. Confirme a importacao

### Formato do Excel pra importacao

O arquivo Excel deve ter colunas com os nomes dos campos dos leads (nome, email, telefone, empresa, etc.). O sistema tenta mapear automaticamente.

### Dica
Exporte um JSON primeiro pra ver o formato. Assim voce sabe exatamente como montar seu arquivo de importacao.

---

## Auditoria

Somente **Admin** e **Gerente** podem acessar.

Mostra um log de tudo que aconteceu no sistema:
- Quem criou, editou ou apagou leads
- Quem mudou configuracoes
- Quem fez login
- Qualquer acao importante

### Pra que serve

- **Seguranca**: saber se alguem fez algo que nao devia
- **Historico**: entender o que mudou e quando
- **Gestao**: ver quem esta ativo no sistema

---

## Notificacoes

O sino no canto superior direito mostra suas notificacoes.

- **Lembretes de compromissos** — 1 hora antes
- **Avisos do sistema**

Voce pode:
- Clicar pra ver todas
- Marcar como lidas
- Marcar todas como lidas de uma vez

---

## Configuracoes

Acesse clicando no seu nome > **Configuracoes**.

### Perfil pessoal
- **Nome** — como voce aparece no sistema
- **Telefone** — seu telefone de contato
- **Seu WhatsApp** — numero com DDD pra identificacao (formato: 5511999999999)

### Aparencia
- **Modo claro** — visual tradicional
- **Modo escuro** — visual escuro, mais confortavel pra uso prolongado ou em ambientes com pouca luz

### Alterar senha
- Digite a senha atual
- Digite a nova senha (minimo 6 caracteres)
- Confirme a nova senha

### Empresa e integracoes (somente Admin)
- **Nome da empresa** — aparece na sidebar e no sistema
- **WhatsApp Business** — configurar a integracao (veja secao abaixo)

---

## Painel do Super Admin

Tela exclusiva do dono da plataforma. Acessada automaticamente ao fazer login com conta Super Admin.

### O que voce ve

- **Total de empresas** no sistema
- **Empresas ativas**
- **Total de usuarios** em todas as empresas
- **Total de leads** em todas as empresas
- **Lista de todas as empresas** com contadores

### O que voce pode fazer

#### Criar empresa
1. Clique em **"+ Nova empresa"**
2. Preencha o nome da empresa
3. Preencha os dados do primeiro admin (nome, email, senha)
4. O sistema cria a empresa com pipeline padrao e o admin pronto pra usar

#### Ver detalhes de uma empresa
Clique em **"Detalhes"** pra ver:
- Metricas da empresa (leads, usuarios, atividades)
- Lista de usuarios com status (ativo/inativo, ultimo acesso)
- Opcao de criar novos usuarios pra empresa
- Opcao de ativar/desativar usuarios

#### Entrar no sistema de uma empresa
Clique em **"Entrar"** pra acessar o CRM daquela empresa como se fosse um admin dela. Uma barra roxa aparece no topo indicando que voce esta dentro de uma empresa. Clique em **"Voltar ao painel"** pra sair.

#### Desativar empresa
Clique em **"Desativar"** pra bloquear o acesso de todos os usuarios daquela empresa. Nenhum dado e apagado — voce pode reativar depois.

---

## Como configurar o WhatsApp

Este e o guia passo a passo pra conectar o WhatsApp da sua empresa ao CRM.

### Pra que serve

Com o WhatsApp configurado, voce pode:
- **Enviar mensagens** pra leads direto do CRM
- **Receber respostas** dos clientes dentro do sistema
- **Ver o historico** completo de conversas

Sem configurar, o sistema ainda funciona — ele abre o WhatsApp Web com a mensagem pronta pra voce enviar manualmente.

### O que voce precisa

1. Uma **conta no Facebook/Meta**
2. Um **numero de telefone** que NAO esteja usando no WhatsApp normal (a API vai usar esse numero)
3. O sistema no ar com **HTTPS** (a Meta exige conexao segura)

### Passo 1: Criar conta de desenvolvedor na Meta

1. Acesse **developers.facebook.com**
2. Faca login com sua conta do Facebook
3. Crie uma conta de desenvolvedor (e gratis)

### Passo 2: Criar um App

1. No painel de desenvolvedor, clique em **"Criar App"**
2. Escolha o tipo **"Business"** (ou "Empresa")
3. De um nome pro app (ex: "CRM WhatsApp")
4. Procure **"WhatsApp"** nos produtos e clique em **"Configurar"**

### Passo 3: Pegar as credenciais

Apos configurar o WhatsApp no app, a Meta te da:

| Credencial | Onde encontrar | Pra que serve |
|---|---|---|
| **Phone Number ID** | Painel do WhatsApp > Numeros de telefone | Identifica o numero que envia mensagens |
| **API Token** | Painel do WhatsApp > Configuracoes da API | A "senha" pra seu sistema falar com a Meta |
| **App Secret** | Configuracoes do App > Basico | Protege as mensagens recebidas |

### Passo 4: Colocar no CRM

1. Faca login no CRM como **Admin** da empresa
2. Va em **Configuracoes**
3. Na secao **"Empresa e Integracoes"**, ache **"WhatsApp Business Cloud API"**
4. Marque **"Ativar integracao oficial desta empresa"**
5. Preencha os campos:
   - **Phone Number ID** — o ID do numero (ex: 123456789012345)
   - **API Version** — deixe como `v22.0` (ou a mais recente)
   - **API Token** — cole o token da Meta (comeca com EAAG...)
   - **Webhook Verify Token** — invente uma senha qualquer (ex: "minha-empresa-2024")
   - **App Secret** — cole o App Secret (recomendado pra seguranca)
6. Clique em **"Salvar integracao do WhatsApp"**

### Passo 5: Configurar o Webhook (pra receber mensagens)

Pra receber mensagens dos clientes no CRM:

1. No painel da Meta, va em **WhatsApp > Configuracoes > Webhook**
2. No campo **URL do callback**, coloque: `https://seudominio.com/api/whatsapp/webhook`
3. No campo **Verify Token**, coloque o mesmo token que voce inventou no passo 4
4. Clique em **"Verificar e salvar"**
5. Assine os campos: **messages** (pra receber mensagens)

### Passo 6: Testar

1. No CRM, va em um lead que tenha telefone
2. Envie uma mensagem pelo WhatsApp
3. Se tudo estiver certo, a mensagem vai direto — sem abrir o WhatsApp Web

### Custos

- Criar conta e app: **gratis**
- A Meta da **1.000 conversas gratis por mes**
- Apos isso: entre **R$0,25 e R$0,80** por conversa, dependendo do tipo

### Problemas comuns

| Problema | Solucao |
|---|---|
| Mensagem nao envia | Verifique se o API Token esta correto e nao expirou |
| Webhook nao verifica | Confira se o Verify Token e identico nos dois lados |
| Nao recebe respostas | Verifique se assinou o campo "messages" no webhook |
| Erro de permissao | O numero precisa estar verificado na Meta Business |

### Se nao quiser configurar agora

Tudo bem! O CRM funciona normalmente sem a Cloud API. Quando voce envia uma mensagem WhatsApp, o sistema abre o WhatsApp Web com a mensagem pronta. Voce so precisa clicar "Enviar". A diferenca e que o historico nao fica salvo no CRM.

---

## Dicas de uso

### Pra vendedores
- **Atualize o pipeline todo dia** — mova os leads conforme a negociacao avanca
- **Registre atividades** — anotou algo na ligacao? Coloque no historico do lead
- **Use etiquetas** — facilita filtrar e encontrar leads depois
- **Agende compromissos no sistema** — os lembretes ajudam a nao esquecer follow-ups

### Pra gerentes
- **Olhe o dashboard regularmente** — identifique gargalos no funil
- **Veja a auditoria** — entenda o que o time esta fazendo
- **Distribua leads** — use o filtro por responsavel pra ver a carga de cada vendedor

### Pra admins
- **Configure o WhatsApp** — a experiencia melhora muito com a integracao
- **Desative usuarios que sairam** — nao apague, desative
- **Exporte dados periodicamente** — mantenha backups em JSON ou Excel
- **Personalize as etapas do pipeline** — adapte pra realidade do seu processo comercial

### Boas praticas gerais
- Leads sem atualizacao ha mais de 30 dias provavelmente estao frios — faca follow-up ou marque como perdido
- Valor estimado ajuda a priorizar — preencha sempre que possivel
- Prioridade "Urgente" deve ser rara — se tudo e urgente, nada e urgente

---

## Historico de alteracoes

| Data | O que mudou |
|---|---|
| 2026-04-12 | Super Admin agora pode fazer todas as acoes de Admin ao entrar numa empresa (criar/editar usuarios, gerenciar pipeline, etc). Adicionada opcao de excluir usuarios permanentemente (antes so desativava). Botao "Excluir" disponivel tanto no painel do Super Admin quanto na tela de Usuarios. |
