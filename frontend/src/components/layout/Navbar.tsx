import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  Truck,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  AlertTriangle,
  BookMarked,
  FileText,
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'PHARMACIST', 'STOREKEEPER'] },
  { path: '/products', icon: Package, label: 'Товары', roles: ['ADMIN', 'MANAGER', 'PHARMACIST', 'STOREKEEPER'] },
  { path: '/pos', icon: ShoppingCart, label: 'Касса', roles: ['ADMIN', 'PHARMACIST'] },
  { path: '/warehouse', icon: Warehouse, label: 'Склад', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { path: '/inventory', icon: ClipboardList, label: 'Инвентаризация', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { path: '/expiry', icon: AlertTriangle, label: 'Сроки годности', roles: ['ADMIN', 'MANAGER', 'PHARMACIST', 'STOREKEEPER'] },
  { path: '/suppliers', icon: Truck, label: 'Поставщики', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { path: '/orders', icon: FileText, label: 'Заказы', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { path: '/reports', icon: BarChart3, label: 'Отчёты', roles: ['ADMIN', 'MANAGER'] },
  { path: '/analytics', icon: TrendingUp, label: 'Аналитика', roles: ['ADMIN', 'MANAGER'] },
  { path: '/users', icon: Users, label: 'Пользователи', roles: ['ADMIN'] },
  { path: '/dictionaries', icon: BookMarked, label: 'Справочники', roles: ['ADMIN', 'MANAGER'] },
  { path: '/settings', icon: Settings, label: 'Настройки', roles: ['ADMIN'] },
];

export default function Navbar() {
  const { user } = useAuth();

  const filteredItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <nav 
      className="flex items-center px-4 border-b overflow-x-auto hide-scrollbar"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <ul className="flex items-center gap-1 h-14">
        {filteredItems.map((item) => (
          <li key={item.path} className="flex-shrink-0">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
