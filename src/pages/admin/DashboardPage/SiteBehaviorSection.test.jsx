import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SiteBehaviorSection from './SiteBehaviorSection';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => 'token-admin'),
}));

const renderSection = (path = '/admin/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteBehaviorSection />
    </MemoryRouter>,
  );

const overview = (period) => ({
  period,
  group_by: period === 'anual' ? 'month' : 'day',
  start: '2026-01-01T00:00:00-03:00',
  end: '2026-01-31T00:00:00-03:00',
  visitors: { registered: 7, anonymous: 11 },
  events_by_type: {
    PAGE_VIEW: 40,
    PRODUCT_VIEW: 9,
    ADD_TO_CART: 4,
    REMOVE_FROM_CART: 1,
    CHECKOUT_STARTED: 2,
    PURCHASE: 1,
  },
  series: [
    { date: '2026-01-10', total: 5 },
    { date: '2026-01-11', total: 0 },
  ],
  top_products: [{ product_id: 'p1', name: 'Boné Shio', views: 6 }],
});

const timelinePage = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'e1',
      event_type: 'PRODUCT_VIEW',
      path: '/product/p1',
      occurred_at: '2026-01-10T15:00:00-03:00',
      product: 'p1',
      product_name: 'Boné Shio',
      variation: null,
    },
    {
      id: 'e2',
      event_type: 'PAGE_VIEW',
      path: '/cart',
      occurred_at: '2026-01-10T14:00:00-03:00',
      product: null,
      product_name: null,
      variation: null,
    },
  ],
};

const maria = { id: 5, name: 'Maria Silva', email: 'maria.silva@gmail.com' };

const jsonResponse = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('SiteBehaviorSection', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn((url) => {
      if (url.includes('/overview/')) {
        const period = new URL(url, 'http://local').searchParams.get('period');
        return jsonResponse(overview(period));
      }
      if (url.includes('/users/search/')) {
        const q = new URL(url, 'http://local').searchParams.get('q');
        if (q.toLowerCase().includes('silva')) return jsonResponse([maria]);
        return jsonResponse([]);
      }
      if (url.includes('/users/5/events/')) return jsonResponse(timelinePage);
      if (url.includes('/users/999/events/')) return jsonResponse({ detail: 'Não encontrado.' }, 404);
      return jsonResponse({}, 500);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('abre a linha do tempo direto quando chega com ?usuario= (atalho da página de clientes)', async () => {
    renderSection('/admin/dashboard?usuario=5');

    expect(await screen.findByText('Produto visualizado')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar usuário')).toHaveValue('5');
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/users/5/events/'))).toBe(true);
  });

  it('mostra os totais e os produtos mais visualizados do período mensal', async () => {
    renderSection();

    expect(await screen.findByText('Visitantes cadastrados')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Boné Shio')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/analytics/overview/?period=mensal');
  });

  it('busca o período anual ao trocar a opção', async () => {
    renderSection();
    await screen.findByText('Visitantes cadastrados');

    fireEvent.click(screen.getByRole('button', { name: 'Anual' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url.includes('period=anual'))).toBe(true),
    );
    expect(screen.getByRole('button', { name: 'Anual' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pede pelo menos 2 caracteres quando o texto é muito curto', async () => {
    renderSection();
    await screen.findByText('Visitantes cadastrados');
    const chamadasAntes = fetchMock.mock.calls.length;

    fireEvent.change(screen.getByLabelText('Buscar usuário'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      screen.getByText('Informe o ID do usuário, ou pelo menos 2 letras do nome ou e-mail.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(chamadasAntes);
  });

  it('busca por nome, lista os resultados e abre a linha do tempo ao escolher um usuário', async () => {
    renderSection();
    await screen.findByText('Visitantes cadastrados');

    fireEvent.change(screen.getByLabelText('Buscar usuário'), { target: { value: 'silva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const opcao = await screen.findByRole('button', { name: /Maria Silva/ });
    expect(opcao).toHaveTextContent('maria.silva@gmail.com');

    fireEvent.click(opcao);

    expect(await screen.findByText('Produto visualizado')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar usuário')).toHaveValue('maria.silva@gmail.com');
    expect(screen.queryByRole('button', { name: /Maria Silva/ })).not.toBeInTheDocument();
  });

  it('informa quando a busca não encontra ninguém', async () => {
    renderSection();
    await screen.findByText('Visitantes cadastrados');

    fireEvent.change(screen.getByLabelText('Buscar usuário'), { target: { value: 'ninguem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Nenhum usuário encontrado.')).toBeInTheDocument();
  });

  it('informa quando o usuário pelo ID não existe', async () => {
    renderSection();
    await screen.findByText('Visitantes cadastrados');

    fireEvent.change(screen.getByLabelText('Buscar usuário'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Usuário não encontrado.')).toBeInTheDocument();
  });
});
