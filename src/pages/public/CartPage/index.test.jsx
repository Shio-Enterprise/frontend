import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CartPage from './index';
import { useCart } from '../../../context/CartContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

vi.mock('../../../context/CartContext', () => ({
  useCart: vi.fn(),
}));

const flushPromises = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('CartPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    useCart.mockReturnValue({
      cartItems: [],
      welcomeDiscountEligible: false,
      welcomeDiscountAmount: '0.00',
      setCartData: vi.fn(),
      refreshCart: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders headline', () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    const headline = screen.getByText(/CartPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('should not show a dead promo code field', () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    expect(screen.queryByPlaceholderText('Código promocional')).not.toBeInTheDocument();
  });

  it('should show the welcome discount line when eligible', async () => {
    useCart.mockReturnValue({
      cartItems: [{ variation_id: '1', product_id: 'p1', product_name: 'Camiseta', size: 'M', sku: 'SKU1', quantity: 1, unit_price: '100.00' }],
      welcomeDiscountEligible: true,
      welcomeDiscountAmount: '10.00',
      setCartData: vi.fn(),
      refreshCart: vi.fn(),
    });
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Desconto de boas-vindas')).toBeInTheDocument();
    expect(screen.getByText('- R$ 10.00')).toBeInTheDocument();
    await flushPromises();
  });

  it('should not show the welcome discount line for an eligible but empty cart (amount 0.00)', () => {
    useCart.mockReturnValue({
      cartItems: [],
      welcomeDiscountEligible: true,
      welcomeDiscountAmount: '0.00',
      setCartData: vi.fn(),
      refreshCart: vi.fn(),
    });
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('Desconto de boas-vindas')).not.toBeInTheDocument();
  });

  describe('acessibilidade (#64, área 4)', () => {
    const item = (over = {}) => ({
      variation_id: 'v1', product_id: 'p1', product_name: 'Camiseta', size: 'M', sku: 'SKU1',
      quantity: 2, unit_price: '100.00', is_sellable: true, ...over,
    });
    const setup = (items, extra = {}) => {
      const setCartData = vi.fn();
      const refreshCart = vi.fn();
      useCart.mockReturnValue({
        cartItems: items, welcomeDiscountEligible: false, welcomeDiscountAmount: '0.00',
        setCartData, refreshCart, ...extra,
      });
      render(<MemoryRouter><CartPage /></MemoryRouter>);
      return { setCartData, refreshCart };
    };

    it('botões de quantidade têm nome com o produto e ficam num grupo nomeado', async () => {
      setup([item()]);
      expect(screen.getByRole('group', { name: 'Quantidade de Camiseta' })).toHaveTextContent('2');
      expect(screen.getByRole('button', { name: 'Diminuir quantidade de Camiseta' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Aumentar quantidade de Camiseta' })).toBeEnabled();
      await flushPromises();
    });

    it('anuncia a nova quantidade depois de mudar', async () => {
      const { setCartData } = setup([item()]);
      await flushPromises();
      fetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) }));
      fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Camiseta' }));
      await waitFor(() => expect(setCartData).toHaveBeenCalled());
      expect(screen.getByTestId('cart-live')).toHaveTextContent('Quantidade de Camiseta: 3.');
    });

    it('durante a atualização o botão fica aria-disabled e mantém o foco', async () => {
      const { setCartData } = setup([item()]);
      await flushPromises();
      let finish;
      fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
      const plus = screen.getByRole('button', { name: 'Aumentar quantidade de Camiseta' });
      plus.focus();
      fireEvent.click(plus);
      expect(plus).toHaveAttribute('aria-disabled', 'true');
      expect(plus).toBeEnabled();
      expect(plus).toHaveFocus();
      fireEvent.click(plus);
      expect(fetch.mock.calls.filter(([, o]) => o?.method === 'PATCH')).toHaveLength(1);
      await act(async () => finish({ ok: true, json: () => Promise.resolve({ items: [] }) }));
      expect(setCartData).toHaveBeenCalledTimes(1);
    });

    it('anuncia falha ao mudar a quantidade', async () => {
      const { refreshCart } = setup([item()]);
      await flushPromises();
      fetch.mockImplementation(() => Promise.resolve({ ok: false }));
      fireEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade de Camiseta' }));
      await waitFor(() => expect(refreshCart).toHaveBeenCalled());
      expect(screen.getByTestId('cart-live')).toHaveTextContent('Não foi possível atualizar a quantidade de Camiseta.');
    });

    it('ao remover, anuncia e leva o foco ao título', async () => {
      setup([item()]);
      await flushPromises();
      fetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) }));
      fireEvent.click(screen.getByRole('button', { name: 'Remover Camiseta' }));
      await waitFor(() => expect(screen.getByTestId('cart-live')).toHaveTextContent('Camiseta removido do carrinho.'));
      expect(screen.getByRole('heading', { level: 1, name: 'Carrinho' })).toHaveFocus();
    });

    it('preço riscado da promoção diz que é o preço original', async () => {
      setup([item({ is_promotion_active: true, base_price: '125.00' })]);
      expect(screen.getByText(/Preço original:/).closest('s')).toHaveTextContent('Preço original: R$ 125.00');
      await flushPromises();
    });

    it('grade não estoura a largura com nome longo (coluna minmax)', async () => {
      setup([item()]);
      const grid = screen.getByRole('heading', { name: 'Resumo do pedido' }).closest('aside').parentElement;
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid.className).toContain('minmax(0,1fr)');
      await flushPromises();
    });

    it('resumo tem título em português', async () => {
      setup([item()]);
      expect(screen.getByRole('heading', { name: 'Resumo do pedido' })).toBeInTheDocument();
      expect(screen.queryByText('Order Summary')).not.toBeInTheDocument();
      await flushPromises();
    });

    it('item indisponível não esmaece o texto (só a foto)', async () => {
      setup([item({ is_sellable: false })]);
      const article = screen.getByRole('heading', { name: 'Camiseta' }).closest('article');
      expect(article.className).not.toMatch(/opacity-/);
      expect(screen.getByText('Indisponível para compra')).toBeInTheDocument();
      await flushPromises();
    });

    it('finalizar compra bloqueado explica o motivo', async () => {
      setup([item({ is_sellable: false })]);
      const link = screen.getByRole('link', { name: /Finalizar compra/ });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAccessibleDescription('Remova os itens indisponíveis para continuar.');
      await flushPromises();
    });
  });
});
