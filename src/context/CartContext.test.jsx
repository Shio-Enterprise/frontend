import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from './CartContext';

const okCartResponse = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      items: [{ id: 1, quantity: 2 }], subtotal: '100.00',
      eligible_for_welcome_discount: true,
      welcome_discount_amount: '20.00',
    }),
  });

beforeEach(() => {
  global.fetch = vi.fn(okCartResponse);
});

function Probe() {
  const { welcomeDiscountEligible, welcomeDiscountAmount } = useCart();
  return <span>{String(welcomeDiscountEligible)}-{welcomeDiscountAmount}</span>;
}

function ProbeWithRefresh() {
  const { welcomeDiscountEligible, welcomeDiscountAmount, cartItems, cartCount, refreshCart } = useCart();
  return (
    <>
      <span data-testid="probe">
        {String(welcomeDiscountEligible)}-{welcomeDiscountAmount}-{cartItems.length}-{cartCount}
      </span>
      <button onClick={refreshCart}>refresh</button>
    </>
  );
}

async function clickRefresh() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));
  });
}

describe('CartContext', () => {
  it('should expose welcome discount eligibility from the cart response', async () => {
    render(<CartProvider><Probe /></CartProvider>);
    expect(await screen.findByText('true-20.00')).toBeInTheDocument();
  });

  it('should reset the welcome discount state when a refresh responds not ok', async () => {
    render(<CartProvider><ProbeWithRefresh /></CartProvider>);
    expect(await screen.findByText('true-20.00-1-2')).toBeInTheDocument();

    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    await clickRefresh();

    expect(screen.getByTestId('probe')).toHaveTextContent('false-0.00-0-0');
  });

  it('should reset the welcome discount state when a refresh throws', async () => {
    render(<CartProvider><ProbeWithRefresh /></CartProvider>);
    expect(await screen.findByText('true-20.00-1-2')).toBeInTheDocument();

    global.fetch = vi.fn(() => Promise.reject(new Error('network down')));
    await clickRefresh();

    expect(screen.getByTestId('probe')).toHaveTextContent('false-0.00-0-0');
  });
});
