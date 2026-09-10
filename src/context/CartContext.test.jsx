import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      items: [], subtotal: '0.00',
      eligible_for_welcome_discount: true,
      welcome_discount_amount: '20.00',
    }),
  })
);

function Probe() {
  const { welcomeDiscountEligible, welcomeDiscountAmount } = useCart();
  return <span>{String(welcomeDiscountEligible)}-{welcomeDiscountAmount}</span>;
}

describe('CartContext', () => {
  it('should expose welcome discount eligibility from the cart response', async () => {
    render(<CartProvider><Probe /></CartProvider>);
    expect(await screen.findByText('true-20.00')).toBeInTheDocument();
  });
});
