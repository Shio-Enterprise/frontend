import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../../assets/logo/logo.svg';
import { Icon } from '../../ui/ShioDesign';
import { useCart } from '../../../context/CartContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setIsMenuOpen(false);
    setShowSearch(false);
    navigate(q ? `/category/all?q=${encodeURIComponent(q)}` : '/category/all');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="w-full bg-white font-inter text-black">
      {showBanner && (
        <div className="relative flex h-9 items-center justify-center bg-black px-10 text-center text-[13px] text-white">
          <p>
            Cadastre-se e ganhe 10% de desconto no seu primeiro pedido.{' '}
            <Link to="/signup" className="font-semibold underline underline-offset-2">
              Cadastre-se agora
            </Link>
          </p>
          <button onClick={() => setShowBanner(false)} className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-white" aria-label="Fechar promoção">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Desktop & Mobile header bar ── */}
      <div className="mx-auto flex h-[60px] max-w-[1240px] items-center justify-between border-b border-black/10 px-5 lg:h-[104px] lg:gap-6 lg:px-6">

        {/* Left: hamburger (mobile) | logo + nav (desktop) */}
        <div className="flex items-center gap-2 lg:gap-10">
          {/* Hamburger / X — mobile only */}
          <button
            className="lg:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} className="h-6 w-6" />
          </button>

          {/* Logo — desktop */}
          <Link to="/" className="hidden items-center lg:flex">
            <img src={logo} alt="Shio Logo" className="h-auto w-[116px]" />
          </Link>

          {/* Logo — mobile (next to hamburger) */}
          <Link to="/" className="flex items-center lg:hidden">
            <img src={logo} alt="Shio Logo" className="h-auto w-[80px]" />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-8 text-[16px] lg:flex">
            <Link to="/" className="transition hover:text-black/60">Início</Link>
            <Link to="/category/all" className="transition hover:text-black/60">Produtos</Link>
            <button onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-black/60">Contato</button>
          </nav>
        </div>

        {/* Desktop search bar */}
        <form onSubmit={handleSearch} className="hidden h-12 max-w-[610px] flex-1 items-center gap-3 rounded-full bg-[#f0f0f0] px-5 text-black/45 lg:flex">
          <Icon name="search" className="h-5 w-5 shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O que você está buscando?"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-black/35"
          />
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          {/* Search icon — mobile only */}
          <button
            className="lg:hidden"
            onClick={() => { setShowSearch((v) => !v); setIsMenuOpen(false); }}
            aria-label="Buscar"
          >
            <Icon name="search" className="h-6 w-6" />
          </button>

          {/* Cart */}
          <Link to="/cart" className="relative transition hover:text-black/60" aria-label="Carrinho" data-testid="cart-link">
            <Icon name="cart" className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* User */}
          <Link to="/my-account" className="transition hover:text-black/60" aria-label="Minha conta" data-testid="my-account-link">
            <Icon name="user" className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* ── Mobile search bar ── */}
      {showSearch && (
        <div className="border-b border-black/10 bg-white px-5 py-3 lg:hidden">
          <form onSubmit={handleSearch} className="flex h-11 items-center gap-3 rounded-full bg-[#f0f0f0] px-5">
            <Icon name="search" className="h-4 w-4 shrink-0 text-black/45" />
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O que você está buscando?"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-black/35"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-black/40">
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      )}

      {/* ── Mobile menu ── */}
      {isMenuOpen && (
        <div className="border-b border-black/10 bg-white lg:hidden">
          <nav>
            <Link
              to="/"
              onClick={closeMenu}
              className="flex h-14 items-center border-b border-black/10 px-6 text-[16px] text-black"
            >
              Início
            </Link>
            <Link
              to="/category/all"
              onClick={closeMenu}
              className="flex h-14 items-center border-b border-black/10 px-6 text-[16px] text-black"
            >
              Produtos
            </Link>
            <button
              onClick={() => {
                closeMenu();
                document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex h-14 w-full items-center px-6 text-left text-[16px] text-black"
            >
              Contato
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
