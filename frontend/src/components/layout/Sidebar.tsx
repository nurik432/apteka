import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Pill,
  AlertTriangle,
  BookMarked,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

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

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();

  const filteredItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
      style={{
        background: 'var(--color-card)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fadeIn min-w-0">
              <h1 className="text-lg font-bold gradient-text truncate">Аптека</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 truncate">Система управления</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="animate-fadeIn truncate min-w-0 flex-1">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}
