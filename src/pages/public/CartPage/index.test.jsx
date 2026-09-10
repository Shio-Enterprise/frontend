import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CartPage from './index';

vi.mock('../../../context/CartContext', () => ({
  useCart: () => ({ cartItems: [], setCartData: vi.fn(), refreshCart: vi.fn() }),
}));

describe('CartPage', () => {
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
});
