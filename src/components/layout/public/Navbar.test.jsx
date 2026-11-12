import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { axe } from 'vitest-axe';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../context/CartContext', () => ({
  useCart: vi.fn(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ isAdmin: false });
    useCart.mockReturnValue({ cartCount: 0 });
  });

  it.each(['desktop', 'mobile'])('envia search codificado pela busca %s', async (viewport) => {
    const router = createMemoryRouter(
      [{ path: '*', element: <Navbar /> }],
      { initialEntries: ['/category/camisetas?q=antiga'] },
    );
    render(<RouterProvider router={router} />);
    if (viewport === 'mobile') fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const input = screen.getAllByRole('searchbox').at(-1);
    fireEvent.change(input, { target: { value: '  algodão & azul  ' } });
    fireEvent.submit(input.closest('form'));
    expect(router.state.location.pathname).toBe('/category/all');
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('search')).toBe('algodão & azul');
    expect(params.has('q')).toBe(false);
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  });

  it('remove a busca ao enviar somente espaços', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <Navbar /> }],
      { initialEntries: ['/category/all?search=antiga'] },
    );
    render(<RouterProvider router={router} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form'));
    expect(router.state.location.pathname).toBe('/category/all');
    expect(router.state.location.search).toBe('');
  });

  it('should render the logo and navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const logos = screen.getAllByAltText('Shio Logo');
    expect(logos.length).toBeGreaterThan(0);

    const inicioLink = screen.getByRole('link', { name: 'Início' });
    expect(inicioLink).toHaveAttribute('href', '/');

    const produtosLink = screen.getByRole('link', { name: 'Produtos' });
    expect(produtosLink).toHaveAttribute('href', '/category/all');

    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute('href', '/contato');

    const cartLink = screen.getByTestId('cart-link');
    expect(cartLink).toBeInTheDocument();

    const myAccountLink = screen.getByTestId('my-account-link');
    expect(myAccountLink).toBeInTheDocument();
  });

  it('opens the contact page and closes the mobile menu', () => {
    const router = createMemoryRouter([{ path: '*', element: <Navbar /> }], { initialEntries: ['/sobre-nos'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(screen.getAllByRole('link', { name: 'Contato' }).at(-1));
    expect(router.state.location.pathname).toBe('/contato');
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  });


  it('exibe acesso ao painel para administrador', () => {
    useAuth.mockReturnValue({ isAdmin: true });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const adminLink = screen.getByTestId('admin-panel-link');
    expect(adminLink).toHaveAttribute('href', '/admin/dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByText('Painel administrativo')).toHaveAttribute('href', '/admin/dashboard');
  });

  it('não exibe acesso ao painel para usuário comum', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('admin-panel-link')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /painel administrativo/i })).not.toBeInTheDocument();
  });

  it('should show the correct welcome discount in the banner', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/10% de desconto/i)).toBeInTheDocument();
  });

  it('clicar em qualquer ponto da faixa de desconto leva ao cadastro', () => {
    const router = createMemoryRouter([{ path: '*', element: <Navbar /> }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    const bannerLink = screen.getByRole('link', { name: /ganhe 10% de desconto/i });
    expect(bannerLink).toHaveAttribute('href', '/signup');
    fireEvent.click(screen.getByText(/ganhe 10% de desconto/i));
    expect(router.state.location.pathname).toBe('/signup');
  });

  it('a faixa de desconto cresce com o texto no celular em vez de cortá-lo', () => {
    const router = createMemoryRouter([{ path: '*', element: <Navbar /> }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    const bannerLink = screen.getByRole('link', { name: /ganhe 10% de desconto/i });
    // Altura fixa (h-9) cortava o texto em 360px, que quebra em 3 linhas.
    expect(bannerLink.parentElement.className).not.toMatch(/(^|\s)h-\d/);
    expect(bannerLink.className).not.toMatch(/(^|\s)h-(full|\d)/);
    expect(bannerLink).toHaveClass('min-h-9');
  });

  it('o X fecha a faixa de desconto sem levar ao cadastro', () => {
    const router = createMemoryRouter([{ path: '*', element: <Navbar /> }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar promoção' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText(/ganhe 10% de desconto/i)).not.toBeInTheDocument();
  });

  it.each([
    [0, 'Carrinho'],
    [1, 'Carrinho 1 item'],
    [3, 'Carrinho 3 itens'],
    [120, 'Carrinho 99+ itens'],
  ])('nome do carrinho inclui o número visível (%i)', (count, name) => {
    useCart.mockReturnValue({ cartCount: count });
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', '/cart');
  });

  it('avisa se o menu do celular está aberto ou fechado', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    const button = screen.getByRole('button', { name: 'Abrir menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
  });
});

// Testes mínimos da #64: vitest-axe sem violações.
describe('Navbar — acessibilidade (axe)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAdmin: false });
  });

  it('sem violações fechado, com o menu aberto e com a busca do celular aberta', async () => {
    const { container } = render(<BrowserRouter><Navbar /></BrowserRouter>);
    expect(await axe(container)).toHaveNoViolations();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(menuButton);
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sem violações para admin (atalho do painel)', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    const { container } = render(<BrowserRouter><Navbar /></BrowserRouter>);
    expect(screen.getByRole('link', { name: 'Painel administrativo' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
