import { NavLink, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { pageRoles } from '@/lib/access';
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
  ChevronDown,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface MenuItem {
  path: string;
  icon: LucideIcon;
  label: string;
  roles: string[];
}

interface MenuGroup {
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;

const menu: MenuEntry[] = [
  { path: '/', icon: LayoutDashboard, label: 'Главная', roles: pageRoles.dashboard },
  { path: '/pos', icon: ShoppingCart, label: 'Касса', roles: pageRoles.pos },
  {
    label: 'Товары',
    icon: Package,
    items: [
      { path: '/products', icon: Package, label: 'Товары', roles: pageRoles.products },
      { path: '/expiry', icon: AlertTriangle, label: 'Сроки годности', roles: pageRoles.expiry },
      { path: '/dictionaries', icon: BookMarked, label: 'Справочники', roles: pageRoles.dictionaries },
    ],
  },
  {
    label: 'Склад',
    icon: Warehouse,
    items: [
      { path: '/warehouse', icon: Warehouse, label: 'Движение товара', roles: pageRoles.warehouse },
      { path: '/inventory', icon: ClipboardList, label: 'Инвентаризация', roles: pageRoles.inventory },
      { path: '/orders', icon: FileText, label: 'Заказы', roles: pageRoles.orders },
      { path: '/suppliers', icon: Truck, label: 'Поставщики', roles: pageRoles.suppliers },
    ],
  },
  {
    label: 'Отчёты',
    icon: BarChart3,
    items: [
      { path: '/reports', icon: BarChart3, label: 'Отчёты', roles: pageRoles.reports },
      { path: '/analytics', icon: TrendingUp, label: 'Аналитика', roles: pageRoles.analytics },
    ],
  },
  {
    label: 'Админ',
    icon: ShieldCheck,
    items: [
      { path: '/users', icon: Users, label: 'Пользователи', roles: pageRoles.users },
      { path: '/settings', icon: Settings, label: 'Настройки', roles: pageRoles.settings },
    ],
  },
];

const isGroup = (entry: MenuEntry): entry is MenuGroup => 'items' in entry;

const isPathActive = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');

const baseLinkClass = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border outline-none';
const activeClass = 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-primary border-primary/20';
const inactiveClass = 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent';

function MenuLink({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}
    >
      <item.icon className="w-4 h-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function MenuDropdown({ group, items }: { group: MenuGroup; items: MenuItem[] }) {
  const { pathname } = useLocation();
  const active = items.some(item => isPathActive(pathname, item.path));

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={`${baseLinkClass} data-[state=open]:bg-muted data-[state=open]:text-foreground ${active ? activeClass : inactiveClass}`}
      >
        <group.icon className="w-4 h-4" />
        <span>{group.label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[200px] p-1 rounded-xl shadow-lg animate-scaleIn"
          style={{
            background: 'var(--color-popover)',
            color: 'var(--color-popover-foreground)',
            border: '1px solid var(--color-border)',
          }}
        >
          {items.map(item => {
            const itemActive = isPathActive(pathname, item.path);
            return (
              <DropdownMenu.Item key={item.path} asChild>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none data-[highlighted]:bg-muted ${
                    itemActive ? 'text-primary font-medium' : ''
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  if (!user) return null;

  const canSee = (item: MenuItem) => item.roles.includes(user.role);

  return (
    <nav
      className="flex items-center px-4 border-b overflow-x-auto hide-scrollbar"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <ul className="flex items-center gap-1 h-14">
        {menu.map(entry => {
          if (!isGroup(entry)) {
            return canSee(entry) ? (
              <li key={entry.path} className="flex-shrink-0">
                <MenuLink item={entry} />
              </li>
            ) : null;
          }

          const items = entry.items.filter(canSee);
          if (items.length === 0) return null;

          return (
            <li key={entry.label} className="flex-shrink-0">
              {items.length === 1 ? <MenuLink item={items[0]} /> : <MenuDropdown group={entry} items={items} />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
