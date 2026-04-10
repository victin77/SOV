import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { api } from '../api/client';
import type { Tag as TagType } from '../types';
import { PageLoading } from '../components/LoadingSpinner';
import Modal from '../components/Modal';

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<TagType | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const load = () => {
    api.getTags()
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor('#6366f1');
    setModal(true);
  };

  const openEdit = (tag: TagType) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
    setModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editing) {
        await api.updateTag(editing.id, { name, color });
      } else {
        await api.createTag({ name, color });
      }
      setModal(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta etiqueta?')) return;
    await api.deleteTag(id);
    load();
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Etiquetas ({tags.length})</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nova Etiqueta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tags.map(tag => (
          <div key={tag.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{tag.name}</p>
                <p className="text-xs text-gray-500">{tag._count?.leads || 0} leads</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(tag)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(tag.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {tags.length === 0 && (
          <div className="col-span-full card p-12 text-center text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma etiqueta criada</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Etiqueta' : 'Nova Etiqueta'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da etiqueta" autoFocus />
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
              <span className="text-sm text-gray-500">{color}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'].map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
