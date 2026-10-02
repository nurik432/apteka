import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { notifyError } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Tags, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Category { id: number; name: string; _count?: { products: number } }
interface Manufacturer { id: number; name: string; _count?: { products: number } }

export default function DictionariesPage() {
  const [tab, setTab] = useState<'categories' | 'manufacturers'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'categories') {
        const res = await api.get('/categories');
        setCategories(res.data);
      } else {
        const res = await api.get('/manufacturers');
        setManufacturers(res.data);
      }
    } catch (err) { notifyError(err, 'Не удалось загрузить справочник'); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setShowForm(true);
  };

  const openEdit = (id: number, name: string) => {
    setEditingId(id);
    setFormName(name);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = tab === 'categories' ? '/categories' : '/manufacturers';
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, { name: formName });
      } else {
        await api.post(endpoint, { name: formName });
      }
      setShowForm(false);
      loadData();
    } catch (error: any) {
      notifyError(error, 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return;
    try {
      const endpoint = tab === 'categories' ? '/categories' : '/manufacturers';
      await api.delete(`${endpoint}/${id}`);
      loadData();
    } catch (error: any) {
      notifyError(error, 'Ошибка удаления');
    }
  };

  const tabs = [
    { key: 'categories' as const, label: 'Категории', icon: Tags },
    { key: 'manufacturers' as const, label: 'Фирмы', icon: Building2 },
  ];

  const dataList = tab === 'categories' ? categories : manufacturers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight">Справочники</h1>
          <p className="text-muted-foreground text-[13px]">Управление категориями и фирмами</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="seg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className="flex items-center gap-2"
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Название</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Товаров</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-5"><div className="space-y-3"><div className="skeleton w-2/3" /><div className="skeleton w-full" /><div className="skeleton w-4/5" /></div></td></tr>
            ) : dataList.length === 0 ? (
              <tr><td colSpan={3}><div className="empty-state"><b>Список пуст</b><p>Добавьте первую запись кнопкой «Добавить».</p></div></td></tr>
            ) : dataList.map(item => (
              <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item._count?.products || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(item.id, item.name)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5"/></button>
                    <button onClick={() => handleDelete(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-card rounded-2xl p-6 animate-scaleIn shadow-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editingId ? 'Редактировать' : 'Добавить'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-lg text-sm"
                  style={{ background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border-strong)' }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted" style={{ border: '1px solid var(--color-border)' }}>Отмена</button>
                <button type="submit" className="px-6 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover">Сохранить</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
