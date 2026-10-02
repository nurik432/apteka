import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, LogOut, Pill } from 'lucide-react';
import { roleLabels } from '@/lib/utils';
import ChangePinDialog from '@/components/ChangePinDialog';
import Navbar from './Navbar';

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

/** Одна строка: логотип, меню, пользователь. В кассе (compact) меню свёрнуто в кнопку. */
export default function Header({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showChangePin, setShowChangePin] = useState(false);

  return (
    <header
      className={`${compact ? 'h-11' : 'h-[52px]'} flex items-center gap-2 px-4 border-b shrink-0 bg-card`}
    >
      {compact ? (
        <>
          <Navbar compact />
          <span className="text-[15px] font-bold ml-2">Касса</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mr-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <span className="text-base font-bold">Аптека</span>
          </div>
          <Navbar />
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        className="btn btn-ghost btn-icon shrink-0"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
        id="theme-toggle"
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      <button
        type="button"
        onClick={() => setShowChangePin(true)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors text-left shrink-0"
        title="Сменить PIN-код"
        id="change-pin-btn"
      >
        <span className="w-[30px] h-[30px] rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
          {initials(user?.fullName)}
        </span>
        <span className="hidden sm:block min-w-0">
          <span className="block text-[13px] font-semibold leading-tight truncate max-w-[160px]">{user?.fullName}</span>
          <span className="block text-[11px] text-muted-foreground leading-tight truncate">
            {user?.role ? roleLabels[user.role] || user.role : ''}
          </span>
        </span>
      </button>

      <button
        onClick={logout}
        className="btn btn-ghost btn-icon shrink-0 hover:!text-destructive hover:!bg-destructive-soft"
        title="Выйти"
        aria-label="Выйти"
        id="logout-btn"
      >
        <LogOut className="w-4 h-4" />
      </button>

      {showChangePin && <ChangePinDialog onClose={() => setShowChangePin(false)} />}
    </header>
  );
}
