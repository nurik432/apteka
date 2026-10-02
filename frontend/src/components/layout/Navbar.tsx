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
  Menu,
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

const baseLinkClass = 'flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors duration-150';
const activeClass = 'bg-primary-soft text-primary-text font-semibold';
const inactiveClass = 'text-muted-foreground hover:text-foreground hover:bg-muted';

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
          className="z-50 min-w-[200px] p-1 rounded-xl animate-scaleIn"
          style={{
            background: 'var(--color-popover)',
            color: 'var(--color-popover-foreground)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {items.map(item => {
            const itemActive = isPathActive(pathname, item.path);
            return (
              <DropdownMenu.Item key={item.path} asChild>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none data-[highlighted]:bg-muted ${
                    itemActive ? 'text-primary-text font-semibold' : ''
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

/** Весь список одним выпадающим меню — для кассы, где шапка компактная */
function CompactMenu({ items }: { items: MenuItem[] }) {
  const { pathname } = useLocation();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="btn btn-ghost h-8 px-2.5 data-[state=open]:bg-muted data-[state=open]:text-foreground">
        <Menu className="w-4 h-4" />
        <span>Меню</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[220px] max-h-[80vh] overflow-y-auto p-1 rounded-xl animate-scaleIn"
          style={{
            background: 'var(--color-popover)',
            color: 'var(--color-popover-foreground)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {items.map(item => (
            <DropdownMenu.Item key={item.path} asChild>
              <NavLink
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none data-[highlighted]:bg-muted ${
                  isPathActive(pathname, item.path) ? 'text-primary-text font-semibold' : ''
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Navbar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;

  const canSee = (item: MenuItem) => item.roles.includes(user.role);

  if (compact) {
    const all = menu.flatMap(entry => (isGroup(entry) ? entry.items : [entry])).filter(canSee);
    return <CompactMenu items={all} />;
  }

  return (
    <nav className="flex items-center min-w-0 overflow-x-auto hide-scrollbar">
      <ul className="flex items-center gap-0.5">
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
