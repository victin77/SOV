import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building, Mail, Phone, User, Calendar, Tag,
  Activity, Edit2, Trash2, DollarSign, Clock, Send, MessageCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { Lead, Tag as TagType } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [tagModal, setTagModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activityText, setActivityText] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const load = () => {
    if (!id) return;
    api.getLead(id)
      .then(setLead)
      .catch(() => navigate('/leads'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.getTags().then(setAllTags).catch(() => {}); }, []);
  useEffect(() => {
    if (!lead) return;
    setWhatsAppMessage(`Olá, ${lead.name}! Estou entrando em contato pelo CRM para dar sequência ao nosso atendimento.`);
  }, [lead?.id]);

  const handleDelete = async () => {
    if (!confirm('Remover este lead?')) return;
    await api.deleteLead(id!);
    navigate('/leads');
  };

  const openTagModal = () => {
    setSelectedTags(lead?.tags?.map(t => t.tagId) || []);
    setTagModal(true);
  };

  const saveTags = async () => {
    await api.updateLeadTags(id!, selectedTags);
    setTagModal(false);
    load();
  };

  const addActivity = async () => {
    if (!activityText.trim()) return;
    await api.addLeadActivity(id!, { type: 'NOTE', description: activityText });
    setActivityText('');
    load();
  };

  const sendWhatsApp = async () => {
    if (!whatsAppMessage.trim()) return;
    try {
      setSendingWhatsApp(true);
      const response = await api.sendLeadWhatsApp(id!, whatsAppMessage.trim());
      if (response.provider === 'link_only' && response.link) {
        window.open(response.link, '_blank', 'noopener,noreferrer');
      }
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (loading || !lead) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/leads')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{lead.name}</h1>
            {lead.company && <p className="text-sm text-gray-500 flex items-center gap-1"><Building className="w-4 h-4" />{lead.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge text-sm ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
          <span className={`badge text-sm ${PRIORITY_COLORS[lead.priority]}`}>{PRIORITY_LABELS[lead.priority]}</span>
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Informacoes</h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${lead.email}`} className="text-primary-600 hover:underline truncate">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-primary-600 hover:underline">{lead.phone}</a>
                </div>
              )}
              {lead.position && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{lead.position}</span>
                </div>
              )}
              {lead.value && (
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-green-600 font-medium">{formatCurrency(lead.value)}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-3 text-sm">
                  <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">Fonte: {lead.source}</span>
                </div>
              )}
              {lead.assignedTo && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">Responsavel: {lead.assignedTo.name}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">Criado em {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              {lead.score > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(lead.score, 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{lead.score}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                <p className="text-xs text-gray-500">Envie mensagens sem sair do CRM.</p>
              </div>
            </div>
            <textarea
              className="input"
              rows={5}
              value={whatsAppMessage}
              onChange={e => setWhatsAppMessage(e.target.value)}
              placeholder="Digite a mensagem para o lead..."
            />
            <div className="flex gap-3 mt-3">
              <button className="btn-primary flex items-center gap-2" onClick={sendWhatsApp} disabled={sendingWhatsApp || !whatsAppMessage.trim()}>
                <Send className="w-4 h-4" />
                {sendingWhatsApp ? 'Enviando...' : 'Enviar mensagem'}
              </button>
              <Link to={`/whatsapp?leadId=${lead.id}`} className="btn-secondary">
                Abrir inbox
              </Link>
            </div>
          </div>

          {/* Tags */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Etiquetas</h3>
              <button onClick={openTagModal} className="text-primary-600 hover:text-primary-700 text-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.tags?.map(t => (
                <span
                  key={t.tagId}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                >
                  {t.tag.name}
                </span>
              ))}
              {(!lead.tags || lead.tags.length === 0) && <p className="text-sm text-gray-400">Sem etiquetas</p>}
            </div>
          </div>
        </div>

        {/* Right - Activities + Appointments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming Appointments */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Compromissos</h3>
            <div className="space-y-3">
              {lead.appointments?.map(apt => (
                <div key={apt.id} className={`flex items-start gap-3 p-3 rounded-lg ${apt.completed ? 'bg-gray-50' : 'bg-primary-50'}`}>
                  <Calendar className={`w-4 h-4 mt-0.5 flex-shrink-0 ${apt.completed ? 'text-gray-400' : 'text-primary-500'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${apt.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{apt.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(apt.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {apt.location && <p className="text-xs text-gray-500">{apt.location}</p>}
                  </div>
                </div>
              ))}
              {(!lead.appointments || lead.appointments.length === 0) && <p className="text-sm text-gray-400">Nenhum compromisso</p>}
            </div>
          </div>

          {/* Add Note */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Adicionar Nota</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={activityText}
                onChange={e => setActivityText(e.target.value)}
                placeholder="Escreva uma nota ou registro de atividade..."
                onKeyDown={e => e.key === 'Enter' && addActivity()}
              />
              <button onClick={addActivity} className="btn-primary flex items-center gap-1 text-sm" disabled={!activityText.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Historico de Atividades</h3>
            <div className="space-y-4">
              {lead.activities?.map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {(!lead.activities || lead.activities.length === 0) && <p className="text-sm text-gray-400">Sem atividades registradas</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      <Modal open={tagModal} onClose={() => setTagModal(false)} title="Gerenciar Etiquetas" size="sm">
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {allTags.map(tag => (
            <label key={tag.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.id)}
                onChange={e => {
                  if (e.target.checked) setSelectedTags(s => [...s, tag.id]);
                  else setSelectedTags(s => s.filter(id => id !== tag.id));
                }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                {tag.name}
              </span>
            </label>
          ))}
          {allTags.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma etiqueta criada</p>}
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button className="btn-secondary" onClick={() => setTagModal(false)}>Cancelar</button>
          <button className="btn-primary" onClick={saveTags}>Salvar</button>
        </div>
      </Modal>
    </div>
  );
}
