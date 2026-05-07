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
16. [Como configurar o WhatsApp (Cloud API)](#como-configurar-o-whatsapp)
17. [Como configurar o WhatsApp via QR Code](#como-configurar-o-whatsapp-via-qr-code)
18. [Como configurar o Google Calendar](#como-configurar-o-google-calendar)
19. [Dicas de uso](#dicas-de-uso)

---

## O que e o CRM Leads

CRM Leads e um sistema de gestao comercial. Ele serve pra:

- **Organizar seus contatos** (leads) em um so lugar
- **Acompanhar o progresso** de cada negociacao pelo pipeline
- **Conversar com clientes** pelo WhatsApp direto do sistema
- **Agendar compromissos** e receber lembretes
- **Sincronizar a agenda com o Google Calendar** de cada usuario
- **Ver metricas** de desempenho da equipe no dashboard
- **Importar/exportar** dados em JSON ou Excel

O sistema e multi-empresa: cada empresa tem seus proprios dados completamente separados. Nenhuma empresa ve os dados de outra.

> [!NOTE]
> Use a busca na barra lateral pra ir direto pra qualquer secao deste guia.

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

> [!TIP]
> Mova os leads pelo pipeline conforme a negociacao avanca. Isso te da uma visao clara de onde cada oportunidade esta — sem precisar abrir relatorio nenhum.

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

O CRM tem integracao com WhatsApp pra voce conversar com leads sem sair do sistema. Existem **duas formas** de conectar — voce escolhe qual fica melhor pro seu caso.

### Os dois modos de conexao

| | **Cloud API (oficial Meta)** | **QR Code (estilo WhatsApp Web)** |
|---|---|---|
| Como conecta | Cadastrando token e numero no painel da Meta | Escaneando um QR Code com o celular |
| Tempo pra configurar | 30-60 minutos (passa por aprovacao) | ~2 minutos |
| Custo | Gratis ate 1.000 conversas/mes, depois R$0,25-0,80 por conversa | Gratis |
| Estabilidade | Muito estavel, suportado oficialmente pela Meta | Pode cair eventualmente, precisa reconectar |
| Risco de banimento | **Zero** (e a forma oficial) | **Existe** — Meta pode bloquear o numero se identificar uso de cliente nao oficial |
| O numero usado | Precisa ser exclusivo (NAO pode estar no WhatsApp do celular) | Funciona com o WhatsApp normal do celular |
| Volume recomendado | Qualquer volume, inclusive alto | Volume baixo a medio |
| Quando ideal | Empresa formal, alto volume, operacao seria | Comecar rapido, vendedor pessoal, testar a feature |

> [!IMPORTANT]
> Os dois modos podem coexistir na mesma empresa. Por exemplo: a empresa configura a Cloud API como oficial, mas alguns vendedores tambem conectam o WhatsApp pessoal via QR pra atender clientes proprios.

### Cloud API — a forma oficial

E a integracao recomendada pra empresas que vao usar WhatsApp como canal serio. A Meta da o servico e cobra apos os primeiros 1.000 atendimentos do mes.

**Vantagens:**
- Sem risco de banimento — voce esta dentro das regras da Meta
- Mensagens vao e vem instantaneamente
- Suporta envio em massa (com regras), templates aprovados, botoes interativos
- Conexao nao cai

**Pontos de atencao:**
- Precisa de uma conta no Meta for Business e passar pela verificacao da empresa
- O numero usado **nao pode** estar logado no app WhatsApp comum
- Tem custo apos 1.000 conversas/mes

Como configurar: veja [Como configurar o WhatsApp (Cloud API)](#como-configurar-o-whatsapp).

### QR Code — a forma rapida

Funciona como o **WhatsApp Web**: voce abre o app no celular, escaneia o QR que aparece no CRM e pronto, conectado. Por baixo dos panos, o servidor mantem uma sessao ativa com o WhatsApp.

**Vantagens:**
- Conecta em 2 minutos, sem burocracia
- Usa o **mesmo numero** que voce ja tem no celular
- Cada vendedor pode conectar o pessoal pra atender clientes seus
- Custo zero

**Pontos de atencao (importante ler antes!):**

> [!CAUTION]
> **A conexao por QR Code nao e oficial da Meta.** Ela usa engenharia reversa do protocolo do WhatsApp Web. A Meta pode, a qualquer momento, identificar que o numero esta sendo usado por um cliente nao oficial e **bloquear o numero**. Nao da pra prever quando isso acontece, mas e mais comum quando o numero envia muitas mensagens em pouco tempo, ou mensagens iguais pra muitos contatos diferentes.

**Outras limitacoes:**
- A sessao pode cair sozinha — se o celular ficar muitos dias sem conexao com a internet, voce vai precisar escanear o QR de novo
- Nao escala bem — cada numero ocupa uma sessao no servidor; conectar 50 vendedores ao mesmo tempo deixa o servidor pesado
- Recursos limitados: nao tem templates aprovados, nao tem botoes interativos, nao tem envio em massa "oficial"
- Se voce desconectar o WhatsApp Web no celular, a sessao do CRM cai junto

**Quando usar QR Code esta OK:**
- Voce esta comecando e quer testar antes de investir na Cloud API
- Conversas em volume baixo a medio (ate dezenas por dia, nao centenas)
- Cada vendedor usa o proprio numero pra atender clientes pessoais
- Voce nao quer (ou nao consegue ainda) passar pela verificacao da Meta

**Quando NAO usar QR Code:**
- Volume alto (centenas/milhares de mensagens por dia) — banimento quase certo
- Numero principal da empresa que voce nao pode perder de jeito nenhum
- Disparos em massa (lista de leads em frio, marketing) — risco altissimo

Como configurar: veja [Como configurar o WhatsApp via QR Code](#como-configurar-o-whatsapp-via-qr-code).

### Numero da empresa vs. numero pessoal

Cada vendedor escolhe nas Configuracoes qual numero o CRM vai usar pra mandar mensagens dele:

- **Numero da empresa** — o que o admin configurou (Cloud API ou QR compartilhado). Todos os vendedores enviam pelo mesmo numero, e respostas chegam no inbox geral.
- **Meu numero** — o vendedor cadastrou o proprio (geralmente via QR). Mensagens enviadas pela ficha do lead saem pelo numero pessoal dele, e respostas chegam direto pra ele.

A escolha fica em **Configuracoes > WhatsApp via QR Code > "Qual numero usar pra enviar mensagens?"**.

Se a opcao escolhida nao estiver conectada no momento do envio, o CRM tenta automaticamente: **QR pessoal -> QR da empresa -> Cloud API -> link do WhatsApp Web** (fallback final).

### Tela de conversas

No menu lateral, clique em **"WhatsApp"**. A tela tem **duas abas**:

**Aba "Leads"** — conversas com numeros que ja sao leads cadastrados no CRM:
- Lista de conversas (lado esquerdo)
- Mensagens da conversa selecionada (lado direito)
- Campo pra digitar e enviar mensagens
- Busca pra encontrar conversas

**Aba "Pendentes"** — conversas com numeros desconhecidos (que ainda nao sao leads):
- Mostra mensagens recebidas de pessoas que nao estao no CRM
- Voce pode ver a conversa antes de decidir se a pessoa vira lead
- Botao **"Adicionar como lead"** cria o lead com o nome do contato (ou um nome que voce escolher) e move todas as mensagens pra ficha dele
- Numeros que voce nao quiser adicionar ficam la sem incomodar

> [!TIP]
> Mensagens de spam, propaganda, ou pessoas que mandaram errado nao poluem mais seu pipeline. Antes do CRM criava lead automatico pra qualquer numero que mandava mensagem; agora a decisao e sua.

A tela funciona igual pros dois modos (Cloud API e QR) — voce nao precisa se preocupar com qual esta ativo.

### Enviando mensagem pela ficha do lead

Voce tambem pode enviar WhatsApp direto da pagina de detalhes de um lead, sem precisar ir na tela de conversas.

### Dica
Pra empresas comecando, a recomendacao e: **usar QR Code pra testar e validar a feature** com volume baixo, e **migrar pra Cloud API** quando o volume aumentar ou quando o WhatsApp virar canal critico.

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

### Sincronizacao com Google Calendar

Se voce conectar sua conta Google em **Configuracoes > Google Calendar**, todo compromisso criado, atualizado ou apagado no CRM e refletido automaticamente no seu Google Calendar pessoal.

- A sincronizacao e **por usuario**: cada vendedor conecta a propria conta Google e ve os compromissos no SEU calendario
- Os eventos vao pro **calendario principal** (primary) do Google
- Se o lead tiver **email cadastrado**, ele e adicionado como convidado no evento (recebe convite por email)
- Compromissos criados **antes** de conectar o Google sao sincronizados na primeira vez que voce edita-los
- Lembretes do Google sao os padrao da sua conta (nao substituem os lembretes internos do CRM)

Veja o passo a passo em [Como configurar o Google Calendar](#como-configurar-o-google-calendar).

### Dica
Sempre associe o compromisso a um lead. Assim voce tem o historico completo de interacoes com aquele contato — e, se o lead tiver email, ele recebe o convite no Google Agenda automaticamente.

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

### Google Calendar (qualquer usuario)
- **Conectar com Google** — vincula sua conta Google pra sincronizar a agenda do CRM com o Google Calendar
- **Desconectar** — quebra o vinculo e para a sincronizacao (compromissos ja existentes no Google nao sao apagados)
- O cartao mostra a **data em que voce conectou** quando ja existe um vinculo ativo
- Veja [Como configurar o Google Calendar](#como-configurar-o-google-calendar)

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

Este e o guia passo a passo pra conectar o WhatsApp da sua empresa ao CRM via **Cloud API** (oficial da Meta). Se voce quer a forma rapida via QR Code, veja [Como configurar o WhatsApp via QR Code](#como-configurar-o-whatsapp-via-qr-code).

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

> [!WARNING]
> O numero de telefone usado na Cloud API **nao pode** estar registrado no WhatsApp comum. Se voce ja usa o WhatsApp normal nele, vai precisar deslogar do app antes de cadastrar na API — caso contrario a Meta rejeita.

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

Voce tambem pode usar o QR Code como alternativa rapida — veja a proxima secao.

---

## Como configurar o WhatsApp via QR Code

Este e o jeito mais rapido de conectar o WhatsApp ao CRM. Voce escaneia um QR Code com o celular (igual o WhatsApp Web) e pronto. **Antes de configurar, leia a secao [WhatsApp](#whatsapp) pra entender as diferencas e os riscos** entre QR Code e Cloud API.

### Quem deve fazer

- **Admin/Gerente** — pode criar uma conexao **da empresa** (compartilhada entre todos os vendedores)
- **Vendedor** — pode criar a propria conexao pessoal

### Pra que serve

- Conectar em 2 minutos sem precisar de conta de desenvolvedor na Meta
- Usar o WhatsApp pessoal pra atender leads
- Testar a feature de WhatsApp no CRM antes de investir na Cloud API

### O que voce precisa

1. Um celular com o **WhatsApp instalado e logado** no numero que vai usar
2. O numero precisa estar com **internet** durante a conexao inicial (depois pode desligar)

> [!WARNING]
> Esse modo de conexao **nao e oficial** da Meta. Existe risco de bloqueio do numero, especialmente se voce mandar muitas mensagens em pouco tempo ou disparos em massa. **Nao use o numero principal da empresa que voce nao pode perder.** Pra usos serios e alto volume, configure a [Cloud API oficial](#como-configurar-o-whatsapp).

### Passo 1: Decidir o tipo de conexao

Voce precisa decidir antes:

- **Conexao da empresa** (so admin/gerente pode criar) — todos os vendedores podem usar esse numero. As mensagens enviadas saem como se fossem da empresa, e respostas caem no inbox geral.
- **Conexao pessoal** (qualquer vendedor) — apenas voce usa. Util pra atender clientes proprios pelo seu numero.

### Passo 2: Criar a conexao no CRM

1. Faca login no CRM
2. Va em **Configuracoes**
3. Encontre a secao **"WhatsApp via QR Code"**
4. Clique em **"Conectar novo numero via QR"**
5. Preencha:
   - **Nome da conexao** — algo descritivo, ex: "WhatsApp Vendas" ou "Meu numero pessoal"
   - **Compartilhar com toda a empresa** — marque so se voce e admin/gerente E quer que seja a conexao oficial da empresa
6. Clique em **"Criar e gerar QR"**

### Passo 3: Escanear o QR Code

Um QR Code vai aparecer na tela. Pra escanear:

1. Abra o **WhatsApp no celular**
2. Toque nos **tres pontinhos** (Android) ou em **Configuracoes** (iPhone)
3. Toque em **"Aparelhos conectados"** (ou "Dispositivos conectados")
4. Toque em **"Conectar um aparelho"**
5. Aponte a camera pro QR Code do CRM
6. Aguarde uns segundos — o status muda pra **"Conectado"**

### Passo 4: Definir como o CRM vai usar

Ainda em Configuracoes, na pergunta **"Qual numero usar pra enviar mensagens?"** escolha:

- **Numero da empresa** — usar a conexao compartilhada
- **Meu numero** — usar a conexao pessoal que voce acabou de criar

A partir daqui, quando voce mandar mensagens pelo CRM, vai sair pelo numero escolhido. Mensagens recebidas dos clientes vao cair na tela **WhatsApp** (inbox).

### Passo 5: Testar

1. Va em um lead que tenha telefone cadastrado
2. Envie uma mensagem WhatsApp pela ficha
3. Confira no celular — a mensagem deve aparecer como enviada pelo seu numero
4. Responda do celular do cliente (ou peca alguem pra mandar uma mensagem pro seu numero)
5. A resposta deve aparecer na tela **WhatsApp** do CRM em poucos segundos

### O que fazer se cair a conexao

A conexao QR pode cair eventualmente — celular sem internet por muito tempo, voce desconectou o WhatsApp Web no celular, ou a Meta resetou as sessoes. Se acontecer:

1. Va em **Configuracoes > WhatsApp via QR Code**
2. Sua conexao vai aparecer com status **"Desconectado"**
3. Clique no botao de **reconectar** (icone de duas setas)
4. Um novo QR vai aparecer — escaneie de novo

> [!TIP]
> Mantenha o celular conectado a internet. O WhatsApp do celular precisa estar online pelo menos uma vez a cada algumas semanas pra manter a sessao viva.

### Boas praticas pra reduzir risco de banimento

Se voce vai usar QR Code, siga essas praticas pra minimizar o risco:

1. **Nao mande mensagens iguais em massa** — a Meta detecta padrao de spam
2. **Espere alguns segundos entre cada envio** — disparos rapidissimos sao bandeira vermelha
3. **Conversas reais, nao prospeccao em frio** — responder leads que pediram contato e seguro; mandar mensagem pra lista de numeros desconhecidos e arriscado
4. **Nao saia adicionando contatos aleatorios** — se voce manda mensagem pra muita gente que nunca te enviou nada antes, o algoritmo da Meta sinaliza
5. **Use um numero "secundario"** — um chip dedicado, nao o numero principal pessoal
6. **Tenha plano B** — se for canal critico, ja vai configurando a Cloud API em paralelo

### Custos

Conexao via QR Code e **gratis**. Voce so paga o chip do numero usado.

### Problemas comuns

| Problema | Solucao |
|---|---|
| QR Code nao aparece | Espere uns segundos, ou clique em **reconectar** |
| QR expirou | E normal, ele se renova a cada ~20 segundos. Se nao escanear a tempo, espere o proximo |
| "Numero ja conectado em outro dispositivo" | Voce pode estar com WhatsApp Web aberto em outro lugar usando o mesmo numero. Feche o outro |
| Sessao cai depois de poucos minutos | Verifique se o celular ficou sem internet ou se voce desconectou o WhatsApp Web manualmente |
| Numero foi banido | Acontece, infelizmente. Voce vai precisar usar outro numero, e dessa vez seguir as boas praticas com mais cuidado. Considerar a Cloud API |

### Comparando com a Cloud API

| | QR Code | Cloud API |
|---|---|---|
| Tempo pra configurar | ~2 minutos | ~30-60 minutos |
| Custo | Gratis | Gratis ate 1.000 conversas/mes, depois R$0,25-0,80 cada |
| Risco de banimento | **Existe** | **Zero** |
| Estabilidade | Pode cair, precisa reconectar | Muito estavel |
| Numero usado | Funciona com qualquer numero do WhatsApp normal | Numero exclusivo, fora do app comum |
| Recursos extras | Nenhum | Templates, botoes, listas, mensagens interativas |
| Escalabilidade | Volume baixo a medio | Qualquer volume |

A escolha entre os dois nao e definitiva — voce pode usar QR pra comecar, validar o uso do canal, e quando o volume crescer migrar pra Cloud API. Os dois modos coexistem.

---

## Como configurar o Google Calendar

Aqui voce aprende a sincronizar a agenda do CRM com o seu Google Calendar pessoal. Tem **duas partes**: a configuracao **uma vez** no servidor (feita pelo Admin/dono da plataforma) e a conexao **individual** que cada usuario faz na propria conta.

### Pra que serve

- Ver os compromissos do CRM dentro do **Google Agenda** (no celular, no computador, no Outlook que sincroniza com Google, etc.)
- Receber lembretes do **proprio Google** alem dos lembretes internos do CRM
- Quando o lead tem email, ele recebe **convite** no email com horario, descricao e local
- Tudo que voce **criar, editar ou apagar** no CRM e refletido no Google em segundos

> [!IMPORTANT]
> A configuracao tem **duas partes**: uma feita pelo Admin do servidor (uma unica vez) e outra que cada usuario faz na propria conta Google. Se a primeira nao foi feita, o cartao "Conectar com Google" nem aparece em Configuracoes.

### Parte 1 — Configuracao do servidor (uma vez por instalacao)

Esta parte so precisa ser feita uma vez, pelo Admin que cuida do servidor. Depois disso, qualquer usuario consegue conectar a propria conta sem mexer em nada disso.

#### Passo 1: Criar projeto no Google Cloud Console

1. Acesse **console.cloud.google.com**
2. Faca login com uma conta Google
3. No topo, clique no seletor de projeto e em **"Novo projeto"**
4. De um nome (ex: "SOV CRM") e crie

#### Passo 2: Ativar a API do Google Calendar

1. No menu lateral, va em **APIs e Servicos > Biblioteca**
2. Procure por **"Google Calendar API"**
3. Clique em **"Ativar"**

#### Passo 3: Configurar a tela de consentimento (OAuth consent screen)

1. Va em **APIs e Servicos > Tela de consentimento OAuth**
2. Escolha **"Externo"** (a menos que sua empresa tenha Google Workspace)
3. Preencha:
   - **Nome do aplicativo**: SOV CRM (ou o nome que voce usa)
   - **Email de suporte**: o seu
   - **Email do desenvolvedor**: o seu
4. Em **Escopos**, adicione: `https://www.googleapis.com/auth/calendar.events`
5. Em **Usuarios de teste** (se ainda em modo Teste), adicione os emails que vao usar antes da publicacao
6. Salve

#### Passo 4: Criar credencial OAuth

1. Va em **APIs e Servicos > Credenciais**
2. Clique em **"+ Criar credenciais" > "ID do cliente OAuth"**
3. Escolha **"Aplicativo da Web"**
4. Em **URIs de redirecionamento autorizados**, adicione:
   - Em **desenvolvimento local**: `http://localhost:3001/api/auth/google-calendar/callback`
   - Em **producao**: `https://seudominio.com/api/auth/google-calendar/callback`
5. Salve. Anote o **Client ID** e o **Client Secret**

> [!CAUTION]
> O **Client Secret** deve ser tratado como senha. Nao commite no git, nao mande no Slack/email, nao deixe em arquivo publico. Se vazar, va no Google Cloud e revogue na hora.

#### Passo 5: Colocar as credenciais no `.env` do servidor

No arquivo `server/.env`, adicione:

```
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
APP_URL="http://localhost:5173"
```

Em producao, ajuste `APP_URL` pro dominio real do CRM (ex: `https://crm.suaempresa.com`).

Se voce precisar de uma URL de callback diferente da padrao (ex: backend em subdominio separado), defina tambem:

```
GOOGLE_CALENDAR_REDIRECT_URI="https://api.suaempresa.com/api/auth/google-calendar/callback"
```

Reinicie o servidor (`npm run dev` ou `npm start`) pra aplicar.

#### Como saber se o servidor reconheceu

No CRM, vai em **Configuracoes**. Se aparecer o cartao **"Google Calendar"** com botao **"Conectar com Google"**, esta tudo certo. Se aparecer "Integracao com Google Calendar nao esta configurada no servidor", as variaveis nao foram lidas — confira o `.env` e reinicie.

### Parte 2 — Conexao do usuario (cada um faz a sua)

Depois que o servidor esta configurado, **cada usuario** que quiser sincronizar precisa conectar a propria conta Google. E rapido:

1. Faca login no CRM com sua conta normal
2. Va em **Configuracoes**
3. Encontre o cartao **"Google Calendar"**
4. Clique em **"Conectar com Google"**
5. Voce e levado pra uma tela do Google pra escolher a conta e autorizar
6. Marque a permissao de **"Ver e editar eventos do calendario"** (e a unica que pedimos)
7. O Google te traz de volta pro CRM. Aparece a mensagem **"Google Calendar conectado com sucesso!"**

A partir desse momento, todo compromisso novo cai automaticamente no seu Google Calendar.

### Como funciona na pratica

| Acao no CRM | O que acontece no Google |
|---|---|
| Criar compromisso | Evento e criado no calendario primario |
| Editar compromisso (titulo, data, descricao, local) | Evento e atualizado |
| Apagar compromisso | Evento e removido |
| Editar um compromisso antigo (criado antes de conectar) | Evento e criado agora pela primeira vez |
| Lead tem email | Lead vira convidado e recebe convite por email |

> O titulo do evento e formado por: `Titulo do compromisso — Nome do lead` (quando ha lead).

### Como desconectar

1. Va em **Configuracoes > Google Calendar**
2. Clique em **"Desconectar"**
3. Confirme

A sincronizacao para. Os eventos que ja existem no Google **nao sao apagados** — eles ficam la, mas nao sao mais atualizados pelo CRM.

> [!TIP]
> Se voce esta trocando de conta Google (ex: pessoal pra corporativa), basta clicar em Desconectar e depois Conectar com Google de novo escolhendo a outra conta.

### Problemas comuns

| Problema | Solucao |
|---|---|
| "Integracao com Google Calendar nao esta configurada no servidor" | O Admin precisa preencher `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no `.env` e reiniciar o servidor |
| "Nao recebemos a permissao completa do Google" apos clicar Conectar | Va em **myaccount.google.com/permissions**, remova o acesso do app e tente conectar de novo |
| Erro `redirect_uri_mismatch` na tela do Google | A URL de callback no Google Cloud nao bate com a do servidor. Confira que adicionou exatamente `http://localhost:3001/api/auth/google-calendar/callback` (ou a URL de producao) nas URIs autorizadas |
| Eventos nao aparecem mesmo conectado | Veja se o compromisso tem datas validas. Erros de sincronizacao ficam no log do servidor — nao quebram a criacao do compromisso no CRM |
| Lead nao recebe convite por email | O lead precisa ter um **email cadastrado** no momento da criacao do compromisso |
| App em modo de Teste no Google | Apenas usuarios de teste cadastrados conseguem conectar. Pra liberar pra todos, publique a tela de consentimento (passa por revisao do Google) |

### Seguranca

- O CRM **nao guarda sua senha do Google** — apenas um `refresh_token` que permite criar/editar eventos
- O escopo solicitado e **apenas** `calendar.events` (ler/escrever eventos), o sistema nao acessa outros dados da sua conta Google
- Quando voce desconecta, o token e revogado no Google
- O log de auditoria registra **CONNECT_GOOGLE_CALENDAR** e **DISCONNECT_GOOGLE_CALENDAR** com data e usuario

### Se nao quiser usar

A sincronizacao e **opcional**. Se nao conectar, a agenda do CRM funciona normalmente — voce so nao tem o reflexo no Google Agenda.

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
- **Configure o Google Calendar** — basta colocar as credenciais no `.env` uma vez; depois cada vendedor conecta a propria conta
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
| 2026-04-12 | Super Admin agora pode fazer todas as acoes de Admin ao entrar numa empresa (criar/editar usuarios, gerenciar pipeline, etc). Adicionada opcao de excluir usuarios permanentemente (antes so desativava). Botao "Excluir" disponivel tanto no painel do Super Admin quanto na tela de Usuarios. Super Admin agora pode excluir empresas permanentemente (com dupla confirmacao). |
| 2026-05-07 | Integracao com Google Calendar. Cada usuario pode conectar a propria conta Google em Configuracoes > Google Calendar. Compromissos criados, atualizados ou apagados na agenda do CRM sao sincronizados automaticamente com o calendario primario do Google. Leads com email viram convidados nos eventos. Adicionado passo a passo de configuracao no servidor (Google Cloud Console, OAuth, variaveis de ambiente) e o fluxo de conexao por usuario. |
| 2026-05-07 | WhatsApp via QR Code adicionado como alternativa a Cloud API. Vendedores podem conectar o proprio numero escaneando QR Code (estilo WhatsApp Web) em Configuracoes > WhatsApp via QR Code. Cada usuario escolhe entre usar o numero da empresa (compartilhado) ou o pessoal. Os dois modos coexistem. Documentadas as diferencas, riscos (incluindo possivel banimento por uso nao oficial) e boas praticas. |
| 2026-05-07 | WhatsApp: corrigido bug de duplicacao de leads quando o numero estava cadastrado com formatacao (parenteses, hifens, espacos) — agora o match identifica corretamente independente da mascara usada. Mensagens de numeros desconhecidos NAO criam mais lead automatico — vao pra aba "Pendentes" no inbox, com botao "Adicionar como lead" pra voce decidir caso a caso. |
