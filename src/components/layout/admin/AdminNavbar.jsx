import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/logo/logo.svg';
import { Icon } from '../../ui/ShioDesign';
import { ADMIN_PERMISSIONS } from '../../../lib/adminPermissions';

const navItems = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: 'grid',
    matches: ['/admin/dashboard'],
    exact: true,
    permission: ADMIN_PERMISSIONS.DASHBOARD,
  },
  {
    label: 'Drops',
    to: '/admin/drops',
    icon: 'tag',
    matches: ['/admin/drops', '/admin/new-drop', '/admin/edit-drop'],
    permission: ADMIN_PERMISSIONS.DROPS,
  },
  {
    label: 'Produtos',
    to: '/admin/products',
    icon: 'box',
    matches: [
      '/admin/products',
      '/admin/new-product',
      '/admin/edit-product',
      '/admin/stock',
    ],
    permission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    label: 'Pedidos',
    to: '/admin/orders',
    icon: 'bag',
    matches: ['/admin/orders'],
    permission: ADMIN_PERMISSIONS.ORDERS,
  },
  {
    label: 'Clientes',
    to: '/admin/customers',
    icon: 'users',
    matches: ['/admin/customers'],
    permission: ADMIN_PERMISSIONS.CUSTOMERS,
  },
  {
    label: 'Avaliações',
    to: '/admin/reviews',
    icon: 'star',
    matches: ['/admin/reviews'],
    permission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    label: 'Permissões',
    to: '/admin/permissions',
    icon: 'shield',
    matches: ['/admin/permissions'],
    permission: ADMIN_PERMISSIONS.ADMIN_PERMISSIONS,
  },
];

function isActive(item, pathname) {
  if (item.exact) {
    return item.matches.includes(pathname);
  }

  return item.matches.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function getUserIdentity(user) {
  const name =
    user?.name ||
    user?.full_name ||
    user?.first_name ||
    user?.username ||
    user?.email ||
    'Administrador';

  const email =
    user?.email && user.email !== name
      ? user.email
      : null;

  return { name, email };
}

export default function AdminNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAdminPermission } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const canAccess = hasAdminPermission ?? (() => true);
  const visibleNavItems = navItems.filter((item) => canAccess(item.permission));
  const currentSection = visibleNavItems.find((item) => isActive(item, pathname)) ?? visibleNavItems[0] ?? navItems[0];
  const identity = getUserIdentity(user);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[290px] lg:flex-col lg:border-r lg:border-black/20 lg:bg-white">
        <div className="flex h-[128px] shrink-0 flex-col items-center justify-center border-b border-black/20">
          <Link to="/admin/dashboard" className="flex flex-col items-center">
            <img src={logo} alt="Shio Logo" className="h-auto w-[92px]" />
            <span className="mt-2 text-[20px] font-medium uppercase text-black">Admin</span>
          </Link>
        </div>

        <nav className="space-y-5 px-5 py-6" aria-label="Navegação administrativa">
          {visibleNavItems.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 items-center gap-5 rounded-[16px] border px-5 text-[20px] ${
                  active ? 'border-black/20 bg-[#f0f0f0]' : 'border-transparent hover:bg-[#f7f7f7]'
                }`}
              >
                <Icon name={item.icon} className={`h-5 w-5 ${active ? 'text-[#c5a100]' : 'text-black'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-5 pb-8">
          <div className="mb-5 rounded-[16px] border border-black/10 bg-[#f7f7f7] px-4 py-4" data-testid="admin-user-summary">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <Icon name="user" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-black" data-testid="admin-user-name">
                  {identity.name}
                </p>
                {identity.email && (
                  <p className="truncate text-[12px] text-black/55" data-testid="admin-user-email">
                    {identity.email}
                  </p>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Administrador</p>
              </div>
            </div>
          </div>

          <div className="border-t border-black/15 pt-5">
            <Link to="/" className="flex h-12 items-center gap-5 text-[18px] text-black">
              <Icon name="arrowLeft" className="h-5 w-5" />
              Voltar para loja
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex h-12 items-center gap-5 text-[18px] text-[#ff3333]"
            >
              <Icon name="logout" className="h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="flex h-[52px] items-center justify-between border-b border-black/10 bg-white px-4">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Menu administrativo">
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
          <Link to="/admin/dashboard" className="flex items-center gap-1.5">
            <img src={logo} alt="Shio" className="h-auto w-[60px]" />
          </Link>
          <span className="text-[13px] font-semibold uppercase tracking-widest text-black/55">Admin</span>
        </div>

        {menuOpen && (
          <div className="border-b border-black/10 bg-white px-4 py-3">
            <div className="mb-2 flex items-center gap-3 border-b border-black/10 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-black">{identity.name}</p>
                {identity.email && <p className="truncate text-[11px] text-black/50">{identity.email}</p>}
              </div>
            </div>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 items-center gap-3 text-[14px] text-black"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              Voltar para loja
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="flex h-10 items-center gap-3 text-[14px] text-[#ff3333]"
            >
              <Icon name="logout" className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}

        <nav className="flex border-b border-black/10 bg-white" aria-label="Navegação administrativa">
          {visibleNavItems.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'border-b-2 border-black text-black' : 'text-black/35'
                }`}
              >
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? 'text-black' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <header className="hidden border-b border-black/20 bg-white lg:ml-[290px] lg:block">
        <div className="flex h-[128px] items-center justify-between px-14">
          <nav className="text-[20px]" aria-label="Localização no painel">
            <span className="text-black/55">Admin</span>
            <span className="mx-2 text-black">/</span>
            <span className="font-semibold text-black" data-testid="admin-current-section">
              {currentSection.label}
            </span>
          </nav>
          <div className="text-right">
            <p className="max-w-[260px] truncate text-[14px] font-semibold text-black">{identity.name}</p>
            <p className="text-[12px] text-black/45">Administrador</p>
          </div>
        </div>
      </header>
    </>
  );
}
