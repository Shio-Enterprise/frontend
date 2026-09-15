import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NewProductPage from './index';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({ data: null, loading: false, error: null, refetch: vi.fn() }),
}));

describe('NewProductPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><NewProductPage /></MemoryRouter>);
    expect(screen.getByText(/NewProductPage/i)).toBeInTheDocument();
  });
});

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'test-token' }));

it('submits cost, promotion and explicit variations without losing a manual SKU', async () => {
  const { fireEvent, waitFor } = await import('@testing-library/react');
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ sku: ['SKU já cadastrado.'] }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><NewProductPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Ex: Moletom'), { target: { value: 'Camisa' } });
  fireEvent.change(screen.getByLabelText('Custo unitário'), { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('SKU 1'), { target: { value: 'manual-sku' } });
  fireEvent.change(screen.getByLabelText('Cor 1'), { target: { value: '#FF0000' } });
  fireEvent.change(screen.getByLabelText('Tamanho 1'), { target: { value: 'M' } });
  fireEvent.submit(screen.getByPlaceholderText('Ex: Moletom').closest('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.cost_price).toBe('60');
  expect(payload.variations).toEqual([{ size: 'M', color: '#FF0000', sku: 'MANUAL-SKU', stock_quantity: 0 }]);
  await screen.findByText(/SKU já cadastrado/);
  expect(screen.getByLabelText('SKU 1')).toHaveValue('MANUAL-SKU');
  expect(screen.getByLabelText('Cor 1')).toHaveValue('#FF0000');
  vi.unstubAllGlobals();
});
