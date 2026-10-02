import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { roleLabels } from '@/lib/utils';
import PinPad from '@/components/PinPad';
import { Pill, Loader2, User, RefreshCw } from 'lucide-react';

interface LoginUser {
  id: number;
  fullName: string;
  role: string;
}

const LAST_USER_KEY = 'lastUserId';

function readLastUserId(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_USER_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export default function LoginPage() {
  const { login } = useAuth();
  const [users, setUsers] = useState<LoginUser[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<LoginUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const lastUserId = readLastUserId();

  const loadUsers = useCallback(async () => {
    setLoadError('');
    setUsers(null);
    try {
      const res = await api.get<LoginUser[]>('/auth/users');
      setUsers(res.data);
      if (res.data.length === 1) setSelected(res.data[0]);
    } catch {
      setLoadError('Не удалось загрузить список сотрудников. Проверьте, что сервер запущен.');
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const selectUser = (user: LoginUser) => {
    setSelected(user);
    setPin('');
    setError('');
  };

  const backToUsers = () => {
    if (loading || (users && users.length === 1)) return;
    setSelected(null);
    setPin('');
    setError('');
  };

  const handleComplete = async (value: string) => {
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      await login(selected.id, value);
      try { localStorage.setItem(LAST_USER_KEY, String(selected.id)); } catch { /* не критично */ }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка подключения к серверу');
      setPin('');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  // Последний вошедший сотрудник — первым в списке
  const sortedUsers = users
    ? [...users].sort((a, b) => (a.id === lastUserId ? -1 : b.id === lastUserId ? 1 : 0))
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[440px] px-4 py-8">
        <div
          className="rounded-2xl p-8 bg-card border animate-scaleIn"
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[11px] bg-primary text-primary-foreground flex items-center justify-center">
              <Pill className="w-[22px] h-[22px]" />
            </div>
            <h1 className="text-xl font-bold">Аптека</h1>
          </div>

          {!selected ? (
            /* Шаг 1: выбор сотрудника */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Выберите сотрудника</p>

              {loadError ? (
                <div className="space-y-3 text-center">
                  <div className="px-4 py-3 rounded-xl text-sm bg-destructive-soft text-destructive">
                    {loadError}
                  </div>
                  <button
                    type="button"
                    onClick={loadUsers}
                    className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Повторить
                  </button>
                </div>
              ) : !sortedUsers ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет активных сотрудников. Обратитесь к администратору.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto p-1">
                  {sortedUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-center border transition-colors duration-150 hover:bg-muted ${
                        user.id === lastUserId ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]' : ''
                      }`}
                    >
                      <span className="w-11 h-11 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[15px] font-bold">
                        {initials(user.fullName) || <User className="w-5 h-5" />}
                      </span>
                      <span className="text-sm font-medium leading-tight line-clamp-2">{user.fullName}</span>
                      <span className="text-xs text-muted-foreground">{roleLabels[user.role] || user.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Шаг 2: ввод PIN */
            <div className="space-y-6">
              <div className="text-center">
                <p className="font-semibold">{selected.fullName}</p>
                <p className="text-sm text-muted-foreground mt-1">Введите PIN-код</p>
              </div>

              <PinPad
                value={pin}
                onChange={value => { setPin(value); if (error) setError(''); }}
                onComplete={handleComplete}
                onBack={users && users.length > 1 ? backToUsers : undefined}
                disabled={loading}
                error={!!error}
                shakeKey={shakeKey}
              />

              <div className="min-h-[44px] flex items-center justify-center" aria-live="assertive">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : error ? (
                  <div className="w-full px-4 py-3 rounded-xl text-sm text-center bg-destructive-soft text-destructive animate-fadeIn">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Версия 1.0 • Все данные хранятся локально
          </p>
        </div>
      </div>
    </div>
  );
}
