import React, { useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Database, Download, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 4) {
      alert('Пароль должен быть не менее 4 символов');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      alert('Пароль успешно изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка');
    }
    setPasswordLoading(false);
  };

  const handleBackup = () => {
    // Create a link to download the database file
    alert('Для создания резервной копии скопируйте файл database/apteka.db в безопасное место.\n\nРасположение: <проект>/database/apteka.db');
  };

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm";
  const inputStyle = { background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground text-sm mt-1">Параметры системы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Смена пароля</h2>
              <p className="text-xs text-muted-foreground">Изменить пароль для {user?.username}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Текущий пароль</label>
              <input type="password" className={inputClass} style={inputStyle} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Новый пароль</label>
              <input type="password" className={inputClass} style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Подтвердите пароль</label>
              <input type="password" className={inputClass} style={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={passwordLoading} className="px-6 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50">
              {passwordLoading ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>

        {/* Backup */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Резервное копирование</h2>
              <p className="text-xs text-muted-foreground">Создание резервной копии базы данных</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Все данные хранятся в файле <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">database/apteka.db</code>. 
            Для создания резервной копии скопируйте этот файл в безопасное место.
          </p>

          <button onClick={handleBackup} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors" style={{ border: '1px solid var(--color-border)' }}>
            <Download className="w-4 h-4" />
            Информация о резервном копировании
          </button>
        </div>

        {/* System Info */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">О системе</h2>
              <p className="text-xs text-muted-foreground">Информация о приложении</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">Название</span>
              <span className="font-medium">Аптека — Система управления</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">Версия</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">База данных</span>
              <span className="font-medium">SQLite</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Режим</span>
              <span className="font-medium">Локальный</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

