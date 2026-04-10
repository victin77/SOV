export function downloadUserGuide() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CRM Leads — Guia do Usuario</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.7; background: #f8fafc; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  .cover { text-align: center; padding: 60px 20px; margin-bottom: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; color: white; }
  .cover h1 { font-size: 2.2em; margin-bottom: 8px; }
  .cover p { font-size: 1.1em; opacity: 0.9; }
  h2 { font-size: 1.5em; color: #6366f1; margin: 48px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  h3 { font-size: 1.15em; color: #334155; margin: 28px 0 12px; }
  p { margin-bottom: 12px; }
  ul, ol { margin: 0 0 16px 24px; }
  li { margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95em; }
  th { background: #6366f1; color: white; text-align: left; padding: 10px 14px; }
  td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f1f5f9; }
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
  .tip { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 0.95em; }
  .tip strong { color: #16a34a; }
  .warning { background: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 0.95em; }
  .warning strong { color: #ca8a04; }
  .step { display: flex; gap: 14px; margin-bottom: 14px; }
  .step-num { width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; flex-shrink: 0; margin-top: 2px; }
  .step-text { flex: 1; }
  .toc { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
  .toc h3 { margin-top: 0; }
  .toc ol { margin-bottom: 0; }
  .toc a { color: #6366f1; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  @media print { body { background: white; } .container { padding: 0; } .cover { break-after: page; } }
  @media (max-width: 600px) { .cover h1 { font-size: 1.6em; } h2 { font-size: 1.3em; } }
</style>
</head>
<body>
<div class="container">

<div class="cover">
  <h1>CRM Leads</h1>
  <p>Guia do Usuario</p>
</div>

<div class="toc">
  <h3>Sumario</h3>
  <ol>
    <li><a href="#intro">O que e o CRM Leads</a></li>
    <li><a href="#acessos">Niveis de acesso</a></li>
    <li><a href="#login">Primeiro acesso e login</a></li>
    <li><a href="#dashboard">Dashboard</a></li>
    <li><a href="#pipeline">Pipeline (Kanban)</a></li>
    <li><a href="#leads">Leads</a></li>
    <li><a href="#whatsapp">WhatsApp</a></li>
    <li><a href="#agenda">Agenda (Compromissos)</a></li>
    <li><a href="#etiquetas">Etiquetas</a></li>
    <li><a href="#usuarios">Usuarios</a></li>
    <li><a href="#importar">Importar e Exportar</a></li>
    <li><a href="#auditoria">Auditoria</a></li>
    <li><a href="#notificacoes">Notificacoes</a></li>
    <li><a href="#configuracoes">Configuracoes</a></li>
    <li><a href="#whatsapp-config">Como configurar o WhatsApp</a></li>
    <li><a href="#dicas">Dicas de uso</a></li>
  </ol>
</div>

<h2 id="intro">1. O que e o CRM Leads</h2>
<p>O CRM Leads e um sistema de gestao comercial feito pra organizar seus contatos, acompanhar negociacoes e fechar mais vendas.</p>
<div class="card">
  <p><strong>Com ele voce pode:</strong></p>
  <ul>
    <li>Organizar todos os seus contatos (leads) em um so lugar</li>
    <li>Acompanhar o progresso de cada negociacao pelo pipeline visual</li>
    <li>Conversar com clientes pelo WhatsApp direto do sistema</li>
    <li>Agendar compromissos e receber lembretes automaticos</li>
    <li>Ver metricas de desempenho no dashboard</li>
    <li>Importar e exportar dados em JSON ou Excel</li>
  </ul>
</div>
<p>Cada empresa tem seus dados completamente separados. Nenhuma empresa ve os dados de outra.</p>

<h2 id="acessos">2. Niveis de acesso</h2>
<p>O sistema tem 3 niveis de usuario dentro de cada empresa:</p>
<table>
  <tr><th>Nivel</th><th>O que pode fazer</th></tr>
  <tr><td><strong>Vendedor</strong></td><td>Ver e editar leads, usar pipeline, agendar compromissos, enviar WhatsApp, importar/exportar</td></tr>
  <tr><td><strong>Gerente</strong></td><td>Tudo do vendedor + gerenciar usuarios e ver auditoria</td></tr>
  <tr><td><strong>Administrador</strong></td><td>Tudo do gerente + configurar empresa, configurar WhatsApp, criar e desativar usuarios</td></tr>
</table>

<h3>Quem deve usar cada nivel?</h3>
<ul>
  <li><strong>Vendedor:</strong> consultores, SDRs, quem trabalha direto com leads</li>
  <li><strong>Gerente:</strong> coordenadores que precisam ver o time todo</li>
  <li><strong>Administrador:</strong> o dono ou responsavel tecnico da empresa</li>
</ul>

<h2 id="login">3. Primeiro acesso e login</h2>
<h3>Pra usuarios novos</h3>
<p>O Administrador ou Gerente da empresa cria a sua conta em <strong>Usuarios &gt; Novo usuario</strong>. Voce recebe email e senha.</p>
<h3>Fazendo login</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Acesse o endereco do sistema no navegador</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Digite seu email e senha</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Clique em <strong>"Entrar"</strong></div></div>

<div class="warning"><strong>Atencao:</strong> Se sua conta ou empresa estiver desativada, o login sera bloqueado. Fale com o administrador.</div>

<h2 id="dashboard">4. Dashboard</h2>
<p>A primeira tela que voce ve ao entrar. Mostra um resumo do seu comercial:</p>
<ul>
  <li><strong>Total de leads</strong> — quantos contatos voce tem</li>
  <li><strong>Leads novos</strong> — quantos entraram no periodo</li>
  <li><strong>Leads ganhos</strong> — quantos fecharam negocio</li>
  <li><strong>Taxa de conversao</strong> — porcentagem de leads que viraram clientes</li>
  <li><strong>Valor total</strong> — soma dos valores dos negocios</li>
  <li><strong>Grafico de tendencia</strong> — evolucao ao longo do tempo</li>
</ul>
<p>Use os filtros de periodo (hoje, esta semana, este mes) pra ver numeros de diferentes intervalos.</p>
<div class="tip"><strong>Dica:</strong> Olhe o dashboard todo dia de manha pra ter uma visao rapida de como esta o comercial.</div>

<h2 id="pipeline">5. Pipeline (Kanban)</h2>
<p>O pipeline e um quadro visual onde cada coluna representa uma etapa da negociacao. Funciona igual um Trello.</p>

<h3>Etapas padrao</h3>
<table>
  <tr><th>Ordem</th><th>Etapa</th><th>Significado</th></tr>
  <tr><td>1</td><td>Novo</td><td>Lead acabou de chegar</td></tr>
  <tr><td>2</td><td>Contato</td><td>Primeiro contato feito</td></tr>
  <tr><td>3</td><td>Qualificacao</td><td>Entendendo se o lead tem perfil</td></tr>
  <tr><td>4</td><td>Proposta</td><td>Proposta enviada</td></tr>
  <tr><td>5</td><td>Negociacao</td><td>Negociando valores e termos</td></tr>
  <tr><td>6</td><td>Fechamento</td><td>Negocio fechado!</td></tr>
</table>

<h3>Como usar</h3>
<ul>
  <li><strong>Arrastar e soltar:</strong> clique em um lead e arraste pra outra coluna quando ele avancar de etapa</li>
  <li><strong>Criar etapas:</strong> Admins podem criar novas etapas ou editar as existentes</li>
  <li><strong>Ver detalhes:</strong> clique no lead pra abrir a ficha completa</li>
</ul>
<div class="tip"><strong>Dica:</strong> Mova os leads pelo pipeline todo dia. Isso te da uma visao clara de onde cada oportunidade esta.</div>

<h2 id="leads">6. Leads</h2>
<p>Tela principal pra gerenciar todos os seus contatos e oportunidades.</p>

<h3>Criando um lead</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Clique em <strong>"+ Novo Lead"</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Preencha os dados: nome, email, telefone, empresa, cargo, origem, valor estimado, prioridade, responsavel e etapa</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Clique em <strong>"Salvar"</strong></div></div>

<h3>Informacoes de um lead</h3>
<p>Clicando num lead, voce ve: dados de contato, historico de atividades (ligacoes, reunioes, anotacoes), etiquetas, valor estimado, prioridade e etapa no pipeline.</p>

<h3>Filtros e busca</h3>
<ul>
  <li><strong>Busca por nome</strong> — encontre rapido digitando</li>
  <li><strong>Filtro por status</strong> — Novo, Contatado, Qualificado, Proposta, Negociacao, Ganho, Perdido</li>
  <li><strong>Filtro por prioridade</strong> — Baixa, Media, Alta, Urgente</li>
  <li><strong>Filtro por responsavel</strong> — leads de um consultor especifico</li>
  <li><strong>Filtro por data</strong> — leads criados em determinado periodo</li>
</ul>

<h3>Acoes em massa</h3>
<p>Selecione varios leads de uma vez pra mudar status, responsavel ou aplicar etiquetas.</p>

<div class="tip"><strong>Dica:</strong> Use etiquetas pra categorizar leads (ex: "Indicacao", "Site", "Evento"). Filtros + etiquetas = encontrar qualquer lead em segundos.</div>

<h2 id="whatsapp">7. WhatsApp</h2>
<p>O CRM tem integracao com WhatsApp pra voce conversar com leads sem sair do sistema.</p>

<h3>Como funciona</h3>
<p>Se o WhatsApp Business estiver configurado pelo administrador, as mensagens vao e voltam direto pelo CRM. Se nao estiver, o sistema abre o WhatsApp Web com a mensagem pronta pra voce enviar.</p>

<h3>Tela de conversas</h3>
<p>No menu lateral, clique em <strong>"WhatsApp"</strong>. Voce vera a lista de conversas na esquerda e as mensagens na direita. Tambem pode enviar WhatsApp direto da ficha de um lead.</p>

<div class="tip"><strong>Dica:</strong> Se o WhatsApp nao esta configurado e voce quer usar, fale com o administrador da empresa. Veja a secao <a href="#whatsapp-config">"Como configurar o WhatsApp"</a>.</div>

<h2 id="agenda">8. Agenda (Compromissos)</h2>
<p>Gerencie reunioes, ligacoes e follow-ups.</p>

<h3>Criando um compromisso</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Clique em <strong>"+ Novo compromisso"</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Preencha: titulo, data/hora de inicio e fim, e associe a um lead (recomendado)</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Salve</div></div>

<h3>Lembretes automaticos</h3>
<p>O sistema avisa voce <strong>1 hora antes</strong> de cada compromisso com:</p>
<ul>
  <li>Um som de alerta</li>
  <li>Uma notificacao na tela (canto superior direito)</li>
  <li>Uma notificacao salva no sino</li>
</ul>

<div class="tip"><strong>Dica:</strong> Sempre associe o compromisso a um lead. Assim voce tem o historico completo de interacoes com aquele contato.</div>

<h2 id="etiquetas">9. Etiquetas</h2>
<p>Etiquetas sao "tags" coloridas pra organizar seus leads.</p>

<h3>Exemplos de uso</h3>
<ul>
  <li><strong>Origem:</strong> "Site", "Indicacao", "Evento", "LinkedIn"</li>
  <li><strong>Segmento:</strong> "Saude", "Tecnologia", "Varejo"</li>
  <li><strong>Temperatura:</strong> "Quente", "Morno", "Frio"</li>
</ul>

<h3>Criando etiquetas</h3>
<p>Va em <strong>"Etiquetas"</strong> no menu, clique em <strong>"+ Nova etiqueta"</strong>, escolha um nome e uma cor.</p>

<div class="tip"><strong>Dica:</strong> Nao exagere. 5 a 10 etiquetas bem pensadas funcionam melhor que 50 confusas.</div>

<h2 id="usuarios">10. Usuarios</h2>
<p><em>Somente Administrador e Gerente podem acessar.</em></p>

<h3>Criando um usuario</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Va em <strong>"Usuarios"</strong> no menu</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Clique em <strong>"+ Novo usuario"</strong></div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Preencha: nome, email, senha, cargo e telefone</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Salve</div></div>

<div class="warning"><strong>Importante:</strong> Quando um vendedor sai da empresa, <strong>desative</strong> a conta dele em vez de apagar. Assim o historico de leads e atividades fica preservado.</div>

<h2 id="importar">11. Importar e Exportar</h2>

<h3>Exportar</h3>
<ul>
  <li><strong>JSON</strong> — arquivo de dados legivel por sistemas</li>
  <li><strong>Excel (XLSX)</strong> — planilha que abre no Excel ou Google Sheets</li>
</ul>

<h3>Importar</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Escolha o formato (JSON ou Excel)</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Selecione o arquivo</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">O sistema mostra uma <strong>previa</strong> antes de importar</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Confira e confirme</div></div>

<div class="tip"><strong>Dica:</strong> Exporte um JSON primeiro pra ver o formato. Assim voce sabe exatamente como montar seu arquivo de importacao.</div>

<h2 id="auditoria">12. Auditoria</h2>
<p><em>Somente Administrador e Gerente podem acessar.</em></p>
<p>Mostra um log de tudo que aconteceu no sistema: quem criou, editou ou apagou leads, quem mudou configuracoes, quem fez login, e qualquer acao importante.</p>
<p>Serve pra seguranca, historico e gestao da equipe.</p>

<h2 id="notificacoes">13. Notificacoes</h2>
<p>O sino no canto superior direito mostra suas notificacoes (lembretes de compromissos, avisos do sistema). Voce pode marcar como lidas individualmente ou todas de uma vez.</p>

<h2 id="configuracoes">14. Configuracoes</h2>
<p>Acesse clicando no seu nome &gt; <strong>Configuracoes</strong>.</p>

<h3>Perfil pessoal</h3>
<ul>
  <li><strong>Nome</strong> — como voce aparece no sistema</li>
  <li><strong>Telefone</strong> — seu telefone de contato</li>
  <li><strong>Seu WhatsApp</strong> — numero com DDD (formato: 5511999999999)</li>
</ul>

<h3>Aparencia</h3>
<ul>
  <li><strong>Modo claro</strong> — visual tradicional</li>
  <li><strong>Modo escuro</strong> — mais confortavel pra uso prolongado</li>
</ul>

<h3>Alterar senha</h3>
<p>Digite a senha atual, a nova senha (minimo 6 caracteres) e confirme.</p>

<h3>Empresa e integracoes (somente Admin)</h3>
<p>Configurar nome da empresa e integracao do WhatsApp Business.</p>

<h2 id="whatsapp-config">15. Como configurar o WhatsApp</h2>
<p>Guia passo a passo pra conectar o WhatsApp da sua empresa ao CRM. <em>Somente o Administrador pode fazer isso.</em></p>

<h3>O que voce ganha configurando</h3>
<ul>
  <li>Enviar mensagens pra leads direto do CRM</li>
  <li>Receber respostas dos clientes dentro do sistema</li>
  <li>Ver o historico completo de conversas</li>
</ul>
<p>Sem configurar, o CRM ainda funciona — ele abre o WhatsApp Web com a mensagem pronta.</p>

<h3>O que voce precisa</h3>
<ul>
  <li>Uma conta no Facebook/Meta</li>
  <li>Um numero de telefone que <strong>nao</strong> esteja usando no WhatsApp normal</li>
  <li>O sistema rodando com HTTPS (conexao segura)</li>
</ul>

<h3>Passo 1: Criar conta na Meta</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Acesse <strong>developers.facebook.com</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Faca login com sua conta do Facebook</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Crie uma conta de desenvolvedor (e gratis)</div></div>

<h3>Passo 2: Criar um App</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Clique em <strong>"Criar App"</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Escolha o tipo <strong>"Business"</strong></div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">De um nome (ex: "CRM WhatsApp")</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Procure <strong>"WhatsApp"</strong> nos produtos e clique em <strong>"Configurar"</strong></div></div>

<h3>Passo 3: Pegar as credenciais</h3>
<table>
  <tr><th>Credencial</th><th>Onde encontrar</th><th>Pra que serve</th></tr>
  <tr><td><strong>Phone Number ID</strong></td><td>Painel do WhatsApp &gt; Numeros de telefone</td><td>Identifica o numero que envia</td></tr>
  <tr><td><strong>API Token</strong></td><td>Painel do WhatsApp &gt; Config. da API</td><td>A "senha" do sistema</td></tr>
  <tr><td><strong>App Secret</strong></td><td>Config. do App &gt; Basico</td><td>Protege mensagens recebidas</td></tr>
</table>

<h3>Passo 4: Colocar no CRM</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">Faca login no CRM como <strong>Admin</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Va em <strong>Configuracoes</strong></div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Na secao <strong>"Empresa e Integracoes"</strong>, ache <strong>"WhatsApp Business Cloud API"</strong></div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Marque <strong>"Ativar integracao oficial desta empresa"</strong></div></div>
<div class="step"><div class="step-num">5</div><div class="step-text">Preencha:<br>
  &bull; <strong>Phone Number ID</strong> — o ID do numero (ex: 123456789012345)<br>
  &bull; <strong>API Version</strong> — deixe como <code>v22.0</code><br>
  &bull; <strong>API Token</strong> — cole o token da Meta (comeca com EAAG...)<br>
  &bull; <strong>Webhook Verify Token</strong> — invente uma senha (ex: "minha-empresa-2024")<br>
  &bull; <strong>App Secret</strong> — cole o App Secret
</div></div>
<div class="step"><div class="step-num">6</div><div class="step-text">Clique em <strong>"Salvar integracao do WhatsApp"</strong></div></div>

<h3>Passo 5: Configurar Webhook (pra receber mensagens)</h3>
<div class="step"><div class="step-num">1</div><div class="step-text">No painel da Meta, va em <strong>WhatsApp &gt; Configuracoes &gt; Webhook</strong></div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">No campo URL, coloque: <code>https://seudominio.com/api/whatsapp/webhook</code></div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">No campo Verify Token, coloque o <strong>mesmo token</strong> que inventou no passo anterior</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Clique em <strong>"Verificar e salvar"</strong></div></div>
<div class="step"><div class="step-num">5</div><div class="step-text">Assine o campo <strong>"messages"</strong> pra receber mensagens</div></div>

<h3>Passo 6: Testar</h3>
<p>Va em um lead que tenha telefone, envie uma mensagem pelo WhatsApp. Se tudo estiver certo, a mensagem vai direto pelo sistema.</p>

<h3>Custos</h3>
<table>
  <tr><th>Item</th><th>Valor</th></tr>
  <tr><td>Criar conta e app</td><td>Gratis</td></tr>
  <tr><td>Primeiras 1.000 conversas/mes</td><td>Gratis</td></tr>
  <tr><td>Conversas adicionais</td><td>R$0,25 a R$0,80 cada</td></tr>
</table>

<h3>Problemas comuns</h3>
<table>
  <tr><th>Problema</th><th>Solucao</th></tr>
  <tr><td>Mensagem nao envia</td><td>Verifique se o API Token esta correto e nao expirou</td></tr>
  <tr><td>Webhook nao verifica</td><td>Confira se o Verify Token e identico nos dois lados</td></tr>
  <tr><td>Nao recebe respostas</td><td>Verifique se assinou o campo "messages" no webhook</td></tr>
  <tr><td>Erro de permissao</td><td>O numero precisa estar verificado na Meta Business</td></tr>
</table>

<h2 id="dicas">16. Dicas de uso</h2>

<h3>Pra vendedores</h3>
<ul>
  <li><strong>Atualize o pipeline todo dia</strong> — mova leads conforme a negociacao avanca</li>
  <li><strong>Registre atividades</strong> — anotou algo na ligacao? Coloque no historico do lead</li>
  <li><strong>Use etiquetas</strong> — facilita filtrar e encontrar leads depois</li>
  <li><strong>Agende compromissos no sistema</strong> — os lembretes ajudam a nao esquecer follow-ups</li>
</ul>

<h3>Pra gerentes</h3>
<ul>
  <li><strong>Olhe o dashboard regularmente</strong> — identifique gargalos no funil</li>
  <li><strong>Veja a auditoria</strong> — entenda o que o time esta fazendo</li>
  <li><strong>Distribua leads</strong> — use o filtro por responsavel pra ver a carga de cada vendedor</li>
</ul>

<h3>Pra administradores</h3>
<ul>
  <li><strong>Configure o WhatsApp</strong> — a experiencia melhora muito</li>
  <li><strong>Desative usuarios que sairam</strong> — nao apague, desative</li>
  <li><strong>Exporte dados periodicamente</strong> — mantenha backups</li>
  <li><strong>Personalize o pipeline</strong> — adapte pra realidade do seu processo</li>
</ul>

<div class="card" style="text-align:center; margin-top: 48px; color: #64748b;">
  <p>CRM Leads &mdash; Guia do Usuario</p>
  <p style="font-size:0.85em;">Para imprimir como PDF: Ctrl+P (ou Cmd+P no Mac) &gt; "Salvar como PDF"</p>
</div>

</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CRM_Leads_Guia_do_Usuario.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
