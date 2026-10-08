export const ADMIN_PERMISSIONS = {
  DASHBOARD: 'access_admin_dashboard',
  CATALOG: 'manage_catalog',
  DROPS: 'manage_drops',
  ORDERS: 'manage_orders',
  CUSTOMERS: 'manage_customers',
  ADMIN_PERMISSIONS: 'manage_admin_permissions',
};

export const ALL_ADMIN_PERMISSIONS = Object.values(ADMIN_PERMISSIONS);

export const ADMIN_PERMISSION_HOME_ROUTES = [
  [ADMIN_PERMISSIONS.DASHBOARD, '/admin/dashboard'],
  [ADMIN_PERMISSIONS.DROPS, '/admin/drops'],
  [ADMIN_PERMISSIONS.CATALOG, '/admin/products'],
  [ADMIN_PERMISSIONS.ORDERS, '/admin/orders'],
  [ADMIN_PERMISSIONS.CUSTOMERS, '/admin/customers'],
  [ADMIN_PERMISSIONS.ADMIN_PERMISSIONS, '/admin/permissions'],
];

export function resolveAdminPermissions(user, isAdmin) {
  if (!isAdmin) return [];
  const configured = Array.isArray(user?.admin_permissions)
    ? user.admin_permissions.filter(Boolean)
    : [];
  // Contas administrativas antigas podem ainda não ter permissões explícitas.
  // O backend preserva acesso completo até a primeira configuração.
  return configured.length ? configured : ALL_ADMIN_PERMISSIONS;
}

export function firstAllowedAdminRoute(permissions) {
  const allowed = new Set(permissions);
  return ADMIN_PERMISSION_HOME_ROUTES.find(([permission]) => allowed.has(permission))?.[1] ?? '/';
}
