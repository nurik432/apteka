import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, LogOut, User } from 'lucide-react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Руководитель',
  PHARMACIST: 'Фармацевт',
  STOREKEEPER: 'Кладовщик',
};

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header 
      className="h-16 flex items-center justify-between px-6 border-b"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div>
        {/* Breadcrumb or page title can go here */}
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
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-medium leading-none truncate max-w-[150px]">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {user?.role ? roleLabels[user.role] || user.role : ''}
            </p>
          </div>
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
    </header>
  );
}
