import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PixPage from './index';
import { getAccessToken } from '../../../lib/authToken';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => null),
}));

afterEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockReturnValue(null);
  delete global.fetch;
});

describe('PixPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <PixPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/PixPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('should not promise an order confirmation email', () => {
    render(
      <MemoryRouter initialEntries={['/pix']}>
        <PixPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/enviamos.*e-mail/i)).not.toBeInTheDocument();
  });

  it('should show the discount fetched from the order detail on the real redirect flow', async () => {
    getAccessToken.mockReturnValue('fake-token');

    global.fetch = vi.fn((url) => {
      if (String(url).includes('pagamento-sucesso')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Pagamento aprovado' }),
        });
      }
      if (String(url).includes('my-orders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            order_number: 'PED-123',
            discount_amount: '20.00',
            total_amount: '95.00',
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/pix?order_nsu=PED-123&transaction_nsu=TX-1&slug=shio']}>
        <PixPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Desconto de boas-vindas')).toBeInTheDocument();
    expect(screen.getByText('- R$ 20.00')).toBeInTheDocument();
    expect(screen.getByText('R$ 95.00')).toBeInTheDocument();
    expect(
      global.fetch.mock.calls.some(([url]) => String(url).includes('/api/orders/my-orders/PED-123/'))
    ).toBe(true);
  });
});
