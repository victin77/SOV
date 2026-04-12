import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, MessageCircle, RefreshCw, Search, Send } from 'lucide-react';
import { api } from '../api/client';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type WhatsAppConversation,
  type WhatsAppConversationThread,
  type WhatsAppMessage,
  type WhatsAppStatus,
} from '../types';
import { PageLoading } from '../components/LoadingSpinner';

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPreview(message: WhatsAppMessage | null) {
  if (!message) return 'Sem mensagens ainda';
  return message.text.length > 72 ? `${message.text.slice(0, 72)}...` : message.text;
}

export default function WhatsAppInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLeadId = searchParams.get('leadId');

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [thread, setThread] = useState<WhatsAppConversationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async (query?: string) => {
    const response = await api.getWhatsAppConversations(query ? { search: query } : undefined);
    setConversations(response);

    if (!selectedLeadId && response.length > 0) {
      setSearchParams({ leadId: response[0].lead.id });
    }
  };

  const loadThread = async (leadId: string) => {
    setThreadLoading(true);
    setError(null);

    try {
      const response = await api.getWhatsAppConversation(leadId);
      setThread(response);
      setMessage((current) => current || `Olá, ${response.lead.name}!`);

      setConversations((current) => {
        const exists = current.some((conversation) => conversation.lead.id === response.lead.id);
        if (exists) return current;
        return [{ lead: response.lead, lastMessage: response.messages.at(-1) || null }, ...current];
      });
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar a conversa.');
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.getWhatsAppStatus(),
      api.getWhatsAppConversations(),
    ])
      .then(([statusResponse, conversationsResponse]) => {
        setStatus(statusResponse);
        setConversations(conversationsResponse);

        if (!selectedLeadId && conversationsResponse.length > 0) {
          setSearchParams({ leadId: conversationsResponse[0].lead.id });
        }
      })
      .catch((err: any) => setError(err.message || 'Não foi possível carregar o WhatsApp.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedLeadId) {
      setThread(null);
      return;
    }

    loadThread(selectedLeadId);
  }, [selectedLeadId]);

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.lead.id === selectedLeadId) || null,
    [conversations, selectedLeadId]
  );

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    await loadConversations(searchInput.trim());
  };

  const handleSelectConversation = (leadId: string) => {
    setSearchParams({ leadId });
  };

  const handleRefresh = async () => {
    await loadConversations(searchQuery);
    if (selectedLeadId) {
      await loadThread(selectedLeadId);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedLeadId || !message.trim()) return;

    try {
      setSending(true);
      setError(null);

      const response = await api.sendWhatsAppConversationMessage(selectedLeadId, message.trim());
      if (response.provider === 'link_only' && response.link) {
        window.open(response.link, '_blank', 'noopener,noreferrer');
      }

      setMessage('');
      await Promise.all([loadConversations(searchQuery), loadThread(selectedLeadId)]);
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Caixa de entrada do CRM usando a integração oficial da Meta.
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {status && (
        <div className={`card p-4 border ${status.configured ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.configured ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300'}`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {status.configured ? 'Cloud API configurada' : 'Modo seguro preparado, mas ainda não conectado'}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                {status.configured
                  ? `Webhook pronto em ${status.webhookPath}. As mensagens entram e saem por dentro do CRM.`
                  : 'Sem token/número oficial, o envio ainda cai no fallback por link do WhatsApp. Quando você conectar a Meta, essa tela vira inbox completa.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className={`badge ${status.tokenConfigured ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>Token</span>
                <span className={`badge ${status.phoneNumberIdConfigured ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>Phone Number ID</span>
                <span className={`badge ${status.verifyTokenConfigured ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>Verify Token</span>
                <span className={`badge ${status.appSecretConfigured ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>App Secret</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-4 border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <form className="flex gap-2" onSubmit={handleSearch}>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-9"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar lead por nome, empresa ou telefone"
                />
              </div>
              <button className="btn-secondary" type="submit">Buscar</button>
            </form>
          </div>

          <div className="max-h-[72vh] overflow-y-auto">
            {conversations.map((conversation) => {
              const active = conversation.lead.id === selectedLeadId;
              return (
                <button
                  key={conversation.lead.id}
                  className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-slate-700 transition-colors ${active ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  onClick={() => handleSelectConversation(conversation.lead.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{conversation.lead.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {conversation.lead.company || conversation.lead.phone || 'Lead sem empresa'}
                      </p>
                    </div>
                    {conversation.lastMessage && (
                      <span className="text-[11px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                        {formatDateLabel(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {formatPreview(conversation.lastMessage)}
                  </p>
                </button>
              );
            })}

            {conversations.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Nenhuma conversa encontrada</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {searchQuery ? 'Tente outro termo de busca.' : 'As mensagens recebidas e enviadas vão aparecer aqui.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-0 overflow-hidden min-h-[72vh] flex flex-col">
          {!selectedLeadId && (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">Selecione uma conversa</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Escolha um lead na lista para abrir o histórico e enviar mensagens.
                </p>
              </div>
            </div>
          )}

          {selectedLeadId && (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {thread?.lead.name || currentConversation?.lead.name || 'Conversa'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {thread?.lead.company || currentConversation?.lead.company || thread?.lead.phone || currentConversation?.lead.phone}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {(thread?.lead.status || currentConversation?.lead.status) && (
                      <span className={`badge text-xs ${STATUS_COLORS[(thread?.lead.status || currentConversation?.lead.status)!]}`}>
                        {STATUS_LABELS[(thread?.lead.status || currentConversation?.lead.status)!]}
                      </span>
                    )}
                    {thread?.lead.stage?.name && (
                      <span className="badge text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200">{thread.lead.stage.name}</span>
                    )}
                  </div>
                </div>
                {selectedLeadId && (
                  <Link className="btn-secondary text-sm" to={`/leads/${selectedLeadId}`}>
                    Abrir lead
                  </Link>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50">
                {threadLoading && (
                  <div className="text-sm text-gray-500 dark:text-slate-400">Carregando conversa...</div>
                )}

                {!threadLoading && thread && thread.messages.length === 0 && (
                  <div className="text-center text-sm text-gray-500 dark:text-slate-400 py-10">
                    Essa conversa ainda não tem histórico. Você já pode enviar a primeira mensagem.
                  </div>
                )}

                {!threadLoading && thread && thread.messages.length > 0 && (
                  <div className="space-y-3">
                    {thread.messages.map((item) => (
                      <div
                        key={item.id}
                        className={`flex ${item.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            item.direction === 'outbound'
                              ? 'bg-primary-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{item.text}</p>
                          <p className={`text-[11px] mt-2 ${item.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400 dark:text-slate-500'}`}>
                            {formatDateLabel(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <textarea
                  className="input"
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Digite a mensagem para o lead..."
                />
                <div className="flex items-center justify-between gap-3 mt-3">
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {status?.configured
                      ? 'Envio oficial pela Cloud API da Meta.'
                      : 'Sem configuração oficial, o envio abre o WhatsApp via link para você concluir manualmente.'}
                  </p>
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim() || !selectedLeadId}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
