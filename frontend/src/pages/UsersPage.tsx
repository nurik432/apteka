import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Plus, Edit2, UserCheck, UserX, X, Shield } from 'lucide-react';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Руководитель',
  PHARMACIST: 'Фармацевт',
  STOREKEEPER: 'Кладовщик',
};

const roleColors: Record<string, string> = {
  ADMIN: 'from-red-500 to-pink-600',
  MANAGER: 'from-blue-500 to-cyan-600',
  PHARMACIST: 'from-emerald-500 to-green-600',
  STOREKEEPER: 'from-amber-500 to-orange-600',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'PHARMACIST' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', password: '', fullName: '', role: 'PHARMACIST' });
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ username: user.username, password: '', fullName: user.fullName, role: user.role });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const data: any = { fullName: form.fullName, role: form.role };
        if (form.password) data.password = form.password;
        await api.put(`/users/${editing.id}`, data);
      } else {
        await api.post('/users', form);
      }
      setShowForm(false);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      if (user.active) {
        await api.delete(`/users/${user.id}`);
      } else {
        await api.put(`/users/${user.id}`, { active: true });
      }
      loadUsers();
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
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление учётными записями</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 transition-all">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className={`rounded-2xl p-5 card-hover ${!user.active ? 'opacity-50' : ''}`} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[user.role] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold truncate max-w-[150px]">{user.fullName}</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">@{user.username}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <button onClick={() => openEdit(user)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5"/></button>
                <button onClick={() => toggleActive(user)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${user.active ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                  {user.active ? <UserX className="w-3.5 h-3.5"/> : <UserCheck className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${roleColors[user.role] || ''} text-white`}>
                {roleLabels[user.role] || user.role}
              </span>
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${user.active ? 'status-green' : 'status-red'}`}>
                {user.active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md flex flex-col rounded-2xl animate-scaleIn shadow-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="text-lg font-bold">{editing ? 'Редактировать' : 'Новый пользователь'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 pt-2 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div><label className="text-sm font-medium">Логин *</label><input className={inputClass} style={inputStyle} value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
              )}
              <div><label className="text-sm font-medium">{editing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}</label><input type="password" className={inputClass} style={inputStyle} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} /></div>
              <div><label className="text-sm font-medium">ФИО *</label><input className={inputClass} style={inputStyle} value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required /></div>
              <div>
                <label className="text-sm font-medium">Роль</label>
                <select className={inputClass} style={inputStyle} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="PHARMACIST">Фармацевт</option>
                  <option value="STOREKEEPER">Кладовщик</option>
                  <option value="MANAGER">Руководитель</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted" style={{ border: '1px solid var(--color-border)' }}>Отмена</button>
                <button type="submit" className="px-6 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">{editing ? 'Сохранить' : 'Создать'}</button>
              </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
