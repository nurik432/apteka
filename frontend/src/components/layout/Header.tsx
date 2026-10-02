import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import { Sun, Moon, LogOut, User, Pill, KeyRound } from 'lucide-react';
import { roleLabels } from '@/lib/utils';
import ChangePinDialog from '@/components/ChangePinDialog';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showChangePin, setShowChangePin] = useState(false);

  return (
    <header 
      className="h-16 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text leading-tight">Аптека</h1>
          <p className="text-[10px] text-muted-foreground leading-tight -mt-0.5">Система управления</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          id="theme-toggle"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User info */}
        <div className="flex items-center gap-1 pl-4 border-l border-border">
          <button
            type="button"
            onClick={() => setShowChangePin(true)}
            className="flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-muted transition-all duration-200 text-left"
            title="Сменить PIN-код"
            id="change-pin-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-medium leading-none truncate max-w-[150px]">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                {user?.role ? roleLabels[user.role] || user.role : ''}
                <KeyRound className="w-3 h-3 opacity-60" />
              </p>
            </div>
          </button>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 ml-1 shrink-0"
            title="Выйти"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showChangePin && <ChangePinDialog onClose={() => setShowChangePin(false)} />}
    </header>
  );
}
