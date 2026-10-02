// Единый источник прав доступа к страницам: используется в маршрутах (App.tsx) и в меню (Navbar.tsx).
// Backend проверяет права отдельно через roleGuard.

const ALL = ['ADMIN', 'MANAGER', 'PHARMACIST', 'STOREKEEPER'];
const STOCK = ['ADMIN', 'MANAGER', 'STOREKEEPER'];
const MGMT = ['ADMIN', 'MANAGER'];

export const pageRoles = {
  dashboard: ALL,
  pos: ['ADMIN', 'PHARMACIST'],
  products: ALL,
  expiry: ALL,
  dictionaries: MGMT,
  warehouse: STOCK,
  inventory: STOCK,
  orders: STOCK,
  suppliers: STOCK,
  reports: MGMT,
  analytics: MGMT,
  users: ['ADMIN'],
  settings: ['ADMIN'],
} satisfies Record<string, string[]>;

export type PageKey = keyof typeof pageRoles;

export const canAccess = (role: string | undefined, page: PageKey) =>
  !!role && pageRoles[page].includes(role);
