import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import PaymentPage from './index';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'test-token' }));
vi.mock('../../../components/layout/public/PublicLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../../context/CartContext', () => ({ useCart: () => ({ refreshCart: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());

it('requires an explicit second confirmation after the server changes prices', async () => {
  const checkout = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: 'price_changed', subtotal: '100.00', items: [{ variation_id: 'variation', quantity: 1, unit_price: '100.00', total_price: '100.00', base_price: '100.00', is_promotion_active: false }] }) });
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/checkout/')) return checkout(url, options);
    let data = {};
    if (url.endsWith('/cart/')) data = { subtotal: '80.00', items: [{ variation_id: 'variation', product_name: 'Camisa', quantity: 1, unit_price: '80.00', base_price: '100.00', is_promotion_active: true }] };
    if (url.endsWith('/addresses/')) data = [{ id: 'address', zip_code: '70000000', street: 'Rua', city: 'Brasília', state: 'DF' }];
    if (url.endsWith('/me/')) data = { phone_number: '61999999999', cpf: '00000000000' };
    return { ok: true, json: async () => data };
  }));
  render(<MemoryRouter><PaymentPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('Revisão'));
  const submit = await screen.findByRole('button', { name: 'Finalizar Compra' });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await screen.findByText(/Os preços mudaram/);
  expect(checkout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(checkout.mock.calls[0][1].body).confirmed_subtotal).toBe('80.00');
  expect(screen.queryByText(/Desconto PIX/)).not.toBeInTheDocument();
  fireEvent.click(submit);
  await waitFor(() => expect(checkout).toHaveBeenCalledTimes(2));
  expect(JSON.parse(checkout.mock.calls[1][1].body).confirmed_subtotal).toBe('100.00');
});
