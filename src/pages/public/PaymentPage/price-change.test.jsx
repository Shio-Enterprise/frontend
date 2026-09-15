import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import PaymentPage from './index';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'test-token' }));
vi.mock('../../../components/layout/public/PublicLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../../context/CartContext', () => ({ useCart: () => ({ refreshCart: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it('requires an explicit second confirmation after the server changes prices', async () => {
  const item = { variation_id: 'variation', product_name: 'Camisa', quantity: 1, unit_price: '80.00', base_price: '100.00', is_promotion_active: true };
  const updatedItem = { ...item, unit_price: '100.00', is_promotion_active: false };
  const checkout = vi.fn().mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ code: 'price_changed', subtotal: '100.00', items: [updatedItem] }) })
    .mockResolvedValue({ ok: false, status: 503, json: async () => ({ message: 'Gateway indisponível.' }) });
  let calculations = 0;
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/checkout/')) return checkout(url, options);
    let data = {};
    if (url.endsWith('/cart/')) data = { subtotal: '80.00', items: [item] };
    if (url.endsWith('/addresses/')) data = [{ id: 'address', zip_code: '70000000', street: 'Rua', city: 'Brasília', state: 'DF' }];
    if (url.endsWith('/me/')) data = { id: 1, phone_number: '61999999999', cpf: '00000000000' };
    if (url.endsWith('/checkout/calculate/')) {
      calculations += 1;
      data = { shipping_quote_id: `quote-${calculations}`, expires_at: new Date(Date.now() + 900000).toISOString(),
        items: [calculations === 1 ? item : updatedItem], subtotal: calculations === 1 ? '80.00' : '100.00',
        shipping_cost: '15.00', discount_amount: '0.00', total_amount: calculations === 1 ? '95.00' : '115.00' };
    }
    return { ok: true, json: async () => data };
  }));
  render(<MemoryRouter><PaymentPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('Revisão'));
  const submit = await screen.findByRole('button', { name: 'Finalizar Compra' });
  const firstConfirmation = await screen.findByRole('checkbox', { name: /Conferi os itens/ });
  expect(submit).toBeDisabled();
  fireEvent.click(firstConfirmation);
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await screen.findByText(/Os preços mudaram/);
  expect(checkout).toHaveBeenCalledTimes(1);
  expect(submit).toBeDisabled();
  const firstPayload = JSON.parse(checkout.mock.calls[0][1].body);
  expect(firstPayload).toEqual({ address_id: 'address', shipping_quote_id: 'quote-1', idempotency_key: expect.any(String) });
  expect(screen.queryByText(/Desconto PIX/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Recalcular cotação' }));
  await screen.findByText('R$ 115.00');
  const confirmation = screen.getByRole('checkbox', { name: /Conferi os itens/ });
  expect(confirmation).not.toBeChecked();
  expect(submit).toBeDisabled();
  expect(checkout).toHaveBeenCalledTimes(1);
  fireEvent.click(confirmation);
  fireEvent.click(submit);
  await waitFor(() => expect(checkout).toHaveBeenCalledTimes(2));
  const secondPayload = JSON.parse(checkout.mock.calls[1][1].body);
  expect(secondPayload).toEqual({ address_id: 'address', shipping_quote_id: 'quote-2', idempotency_key: expect.any(String) });
  expect(secondPayload.idempotency_key).not.toBe(firstPayload.idempotency_key);
});
