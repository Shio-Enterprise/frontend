import { Link, useLocation, useNavigate } from 'react-router-dom';
import PublicLayout from '../public/PublicLayout';
import { Icon } from '../../ui/ShioDesign';
import { clearAuthTokens } from '../../../lib/authToken';

const navItems = [
  { label: 'Meus Dados', to: '/my-account', icon: 'users' },
  { label: 'Meus Pedidos', to: '/my-orders', icon: 'box' },
  { label: 'Endereços', to: '/addresses', icon: 'tag' },
];

export default function AccountLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/');
  };

  const isActive = (to) =>
    pathname === to || (to === '/my-orders' && pathname.startsWith('/my-orders'));

  return (
    <PublicLayout showNewsletter={false}>

      {/* ── Mobile nav ────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Back + logout row */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <Link to="/" className="flex items-center gap-2 text-[14px] text-black">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Voltar para Loja
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 text-[14px] text-[#ff3333]">
            <Icon name="logout" className="h-4 w-4" />
            Sair
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-black/10">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${active ? 'border-b-2 border-black text-black' : 'text-black/35'
                  }`}>
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Page content ──────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-5 py-8 lg:grid lg:grid-cols-[255px_1fr] lg:gap-12 lg:px-6 lg:py-16">
        {/* Desktop sidebar */}
        <aside className="hidden h-full lg:flex lg:flex-col">
          <div className="space-y-5">
            {navItems.map((item) => {
              const active = isActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex h-14 items-center gap-5 rounded-[16px] border px-5 text-[20px] ${active
                      ? 'border-black/25 bg-[#f0f0f0] text-black'
                      : 'border-transparent text-black hover:bg-[#f7f7f7]'
                    }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Sempre no final da sidebar */}
          <div className="mt-auto pt-10">
            <div className="border-t border-black/15 pt-6">
              <Link
                to="/"
                className="flex h-12 items-center gap-5 text-[18px] text-black"
              >
                <Icon name="arrowLeft" className="h-5 w-5" />
                Voltar para Loja
              </Link>

              <button
                onClick={handleLogout}
                className="mt-3 flex h-12 items-center gap-5 text-[18px] text-[#ff3333]"
              >
                <Icon name="logout" className="h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        <div>{children}</div>
      </section>
    </PublicLayout>
  );
}
