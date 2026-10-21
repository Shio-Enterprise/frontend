import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MyStockAlertsPage from './index';
import { cancelStockAlert, listStockAlerts } from '../../../lib/stockAlertsApi';

vi.mock('../../../lib/stockAlertsApi', () => ({
  listStockAlerts: vi.fn(),
  cancelStockAlert: vi.fn(),
  stockAlertErrorMessage: (error, fallback) => fallback ?? error.message,
}));
vi.mock('../../../components/ui/ShioDesign', () => ({ Icon: () => null, PageMarker: () => null }));
vi.mock('../../../components/layout/user/AccountLayout', () => ({ default: ({ children }) => <main>{children}</main> }));

const alert = (id, overrides = {}) => ({
  id, variation_id: id * 10, size: 'M', color: 'Preto',
  created_at: '2026-10-01T12:00:00Z', notified_at: null,
  product: { id: `p${id}`, name: `Produto ${id}`, image: null, is_visible: true },
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><MyStockAlertsPage /></MemoryRouter>);

describe('MyStockAlertsPage', () => {
  beforeEach(() => { listStockAlerts.mockReset(); cancelStockAlert.mockReset(); });

  it('lista aguardando com Cancelar e avisados com data', async () => {
    listStockAlerts.mockResolvedValue([alert(1), alert(2, { notified_at: '2026-10-20T12:00:00Z' })]);
    renderPage();
    expect(await screen.findByText('Aguardando')).toBeInTheDocument();
    expect(screen.getByText('Avisado em 20/10/2026')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /cancelar/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Produto 1' })).toHaveAttribute('href', '/product/p1');
  });

  it('cancelar remove a linha', async () => {
    listStockAlerts.mockResolvedValue([alert(1), alert(3)]);
    cancelStockAlert.mockResolvedValue();
    renderPage();
    await screen.findByText('Produto 1');
    fireEvent.click(screen.getAllByRole('button', { name: /cancelar/i })[0]);
    await waitFor(() => expect(screen.queryByText('Produto 1')).not.toBeInTheDocument());
    expect(cancelStockAlert).toHaveBeenCalledWith(1);
    expect(screen.getByText('Produto 3')).toBeInTheDocument();
  });

  it('estado vazio explica o recurso', async () => {
    listStockAlerts.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/tamanho esgotado/i)).toBeInTheDocument();
  });

  it('erro de carregamento mostra alerta e tentar novamente', async () => {
    listStockAlerts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/tamanho esgotado/i)).toBeInTheDocument();
    expect(listStockAlerts).toHaveBeenCalledTimes(2);
  });

  it('produto fora da loja aparece sem link', async () => {
    listStockAlerts.mockResolvedValue([alert(1, { product: { id: 'p1', name: 'Produto 1', image: null, is_visible: false } })]);
    renderPage();
    expect(await screen.findByText('Produto 1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Produto 1' })).not.toBeInTheDocument();
  });
});
