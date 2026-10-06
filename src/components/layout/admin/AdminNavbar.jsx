import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/logo/logo.svg';
import { Icon } from '../../ui/ShioDesign';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'grid'  },
  { label: 'Drops',     to: '/admin/drops',     icon: 'tag'   },
  { label: 'Produtos',  to: '/admin/products',  icon: 'box'   },
  { label: 'Pedidos',   to: '/admin/orders',    icon: 'bag'   },
  { label: 'Clientes',  to: '/admin/customers', icon: 'users' },
];

function isActive(item, pathname) {
  if (item.to === '/admin/dashboard') return pathname === item.to || pathname.startsWith(`${item.to}/`);
  return pathname.startsWith(item.to);
}

export default function AdminNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      {/* ══════════════════════════════════════════
          DESKTOP sidebar (hidden on mobile)
      ══════════════════════════════════════════ */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[290px] lg:flex-col lg:border-r lg:border-black/20 lg:bg-white">
        <div className="flex h-[128px] shrink-0 flex-col items-center justify-center border-b border-black/20">
          <Link to="/admin/dashboard" className="flex flex-col items-center">
            <img src={logo} alt="Shio Logo" className="h-auto w-[92px]" />
            <span className="mt-2 text-[20px] font-medium uppercase text-black">Admin</span>
          </Link>
        </div>

        <nav className="space-y-5 px-5 py-6">
          {navItems.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link key={item.to} to={item.to}
                className={`flex h-14 items-center gap-5 rounded-[16px] border px-5 text-[20px] ${
                  active ? 'border-black/20 bg-[#f0f0f0]' : 'border-transparent hover:bg-[#f7f7f7]'
                }`}>
                <Icon name={item.icon} className={`h-5 w-5 ${active ? 'text-[#c5a100]' : 'text-black'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-5 pb-8">
          <div className="border-t border-black/15 pt-6">
            <Link to="/" className="flex h-12 items-center gap-5 text-[18px] text-black">
              <Icon name="arrowLeft" className="h-5 w-5" />
              Voltar para Loja
            </Link>
            <button type="button" onClick={handleLogout}
              className="mt-3 flex h-12 items-center gap-5 text-[18px] text-[#ff3333]">
              <Icon name="logout" className="h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE header + tab bar (hidden on lg+)
      ══════════════════════════════════════════ */}
      <div className="lg:hidden">
        {/* Top header */}
        <div className="flex h-[52px] items-center justify-between border-b border-black/10 bg-white px-4">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
          <Link to="/admin/dashboard" className="flex items-center gap-1.5">
            <img src={logo} alt="Shio" className="h-auto w-[60px]" />
          </Link>
          <span className="text-[13px] font-semibold uppercase tracking-widest text-black/55">Admin</span>
        </div>

        {/* Slide-down menu: Voltar + Sair */}
        {menuOpen && (
          <div className="border-b border-black/10 bg-white px-4 py-3">
            <Link to="/" onClick={() => setMenuOpen(false)}
              className="flex h-10 items-center gap-3 text-[14px] text-black">
              <Icon name="arrowLeft" className="h-4 w-4" />
              Voltar para Loja
            </Link>
            <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }}
              className="flex h-10 items-center gap-3 text-[14px] text-[#ff3333]">
              <Icon name="logout" className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b border-black/10 bg-white">
          {navItems.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'border-b-2 border-black text-black' : 'text-black/35'
                }`}>
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? 'text-black' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop breadcrumb header */}
      <header className="hidden border-b border-black/20 bg-white lg:ml-[290px] lg:block">
        <div className="flex h-[128px] items-center px-14">
          <nav className="text-[20px]">
            <span className="text-black/55">Admin</span>
            <span className="mx-2 text-black">/</span>
            <span className="font-semibold text-black">
              {navItems.find((n) => isActive(n, pathname))?.label ?? 'Dashboard'}
            </span>
          </nav>
        </div>
      </header>
    </>
  );
}
