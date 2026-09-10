import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CartPage from './index';
import { useCart } from '../../../context/CartContext';

vi.mock('../../../context/CartContext', () => ({
  useCart: vi.fn(),
}));

describe('CartPage', () => {
  beforeEach(() => {
    useCart.mockReturnValue({
      cartItems: [],
      welcomeDiscountEligible: false,
      welcomeDiscountAmount: '0.00',
      setCartData: vi.fn(),
      refreshCart: vi.fn(),
    });
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

  it('should show the welcome discount line when eligible', () => {
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
});
