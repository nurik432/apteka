import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, Search, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  _count?: { movements: number };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });

  useEffect(() => { loadSuppliers(); }, [search]);

  const loadSuppliers = async () => {
    try {
      const res = await api.get(`/suppliers?search=${encodeURIComponent(search)}`);
      setSuppliers(res.data);
    } catch { }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', contactName: '', phone: '', email: '', address: '' });
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', address: s.address || '' });
    setShowForm(true);
  };

  const viewDetail = async (id: number) => {
    const res = await api.get(`/suppliers/${id}`);
    setShowDetail(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      loadSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить поставщика?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      loadSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка');
    }
  };

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm";
  const inputStyle = { background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Поставщики</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление поставщиками</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all">
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Поиск поставщиков..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl text-sm" style={inputStyle} />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="rounded-2xl p-5 card-hover cursor-pointer" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} onClick={() => viewDetail(supplier.id)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{supplier.name}</h3>
                  {supplier.contactName && <p className="text-xs text-muted-foreground truncate">{supplier.contactName}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(supplier)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5"/></button>
                <button onClick={() => handleDelete(supplier.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {supplier.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5"/>{supplier.phone}</p>}
              {supplier.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5"/>{supplier.email}</p>}
              {supplier.address && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5"/>{supplier.address}</p>}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Поставок: {supplier._count?.movements || 0}</p>
          </div>
        ))}
        {!loading && suppliers.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">Поставщики не найдены</p>
        )}
      </div>

      {/* Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md flex flex-col rounded-2xl animate-scaleIn shadow-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="text-lg font-bold">{editing ? 'Редактировать' : 'Новый поставщик'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 pt-2 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-sm font-medium">Название *</label><input className={inputClass} style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label className="text-sm font-medium">Контактное лицо</label><input className={inputClass} style={inputStyle} value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} /></div>
              <div><label className="text-sm font-medium">Телефон</label><input className={inputClass} style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-sm font-medium">Email</label><input type="email" className={inputClass} style={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="text-sm font-medium">Адрес</label><input className={inputClass} style={inputStyle} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted" style={{ border: '1px solid var(--color-border)' }}>Отмена</button>
                <button type="submit" className="px-6 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 transition-all">{editing ? 'Сохранить' : 'Создать'}</button>
              </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {showDetail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-lg flex flex-col rounded-2xl animate-scaleIn shadow-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="text-lg font-bold">{showDetail.name}</h2>
              <button onClick={() => setShowDetail(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 pt-2 overflow-y-auto flex-1 min-h-0">
              <h3 className="font-semibold mb-2">История поставок</h3>
            {showDetail.movements?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Нет поставок</p>
            ) : (
              <div className="space-y-2">
                {showDetail.movements?.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--color-muted)' }}>
                    <div>
                      <p className="text-sm font-medium">{m.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{m.quantity} {m.product?.unit || 'ед.'}</span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

