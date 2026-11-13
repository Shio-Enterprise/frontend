import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

describe('OrdersPage', () => {
  beforeEach(() => {
    useApiMock.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renderiza o título e o botão de exportar', () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('mostra o selo do reembolso e filtra pelo status dele', () => {
    useApiMock.mockReturnValue({
      data: [{
        id: 'abcdef12-0000-0000-0000-000000000000',
        customer_name: 'Ana',
        created_at: '2026-10-20T10:00:00Z',
        total_amount: '200.00',
        status: 'PREPARING',
        refund_status: 'REQUESTED',
      }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    // Card (celular) e tabela (desktop) ficam no DOM; o CSS escolhe qual aparece.
    expect(screen.getAllByText('Reembolso solicitado')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Filtrar por reembolso'), { target: { value: 'REQUESTED' } });
    expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/?refund_status=REQUESTED');
  });
  it('mostra o selo da troca e combina os filtros de reembolso e troca', () => {
    useApiMock.mockReturnValue({
      data: [{
        id: 'abcdef12-0000-0000-0000-000000000000',
        customer_name: 'Ana',
        created_at: '2026-10-20T10:00:00Z',
        total_amount: '200.00',
        status: 'DELIVERED',
        refund_status: null,
        exchange_status: 'APPROVED',
      }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Troca aprovada')).toHaveLength(2);
    const filter = screen.getByLabelText('Filtrar por troca');
    expect(screen.getByRole('option', { name: 'Troca: peça recebida' })).toBeInTheDocument();
    fireEvent.change(filter, { target: { value: 'RECEIVED' } });
    expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/?exchange_status=RECEIVED');
    fireEvent.change(screen.getByLabelText('Filtrar por reembolso'), { target: { value: 'REJECTED' } });
    expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/?refund_status=REJECTED&exchange_status=RECEIVED');
  });

  describe('acessibilidade (#64)', () => {
    const order = {
      id: 'abcdef12-0000-0000-0000-000000000000',
      customer_name: 'Ana',
      created_at: '2026-10-20T10:00:00Z',
      total_amount: '200.00',
      status: 'AWAITING_PAYMENT',
    };

    afterEach(() => vi.unstubAllGlobals());

    it('cancelar pedido pede confirmação num modal e anuncia o resultado', async () => {
      const refetch = vi.fn();
      useApiMock.mockReturnValue({ data: [order], loading: false, error: null, refetch });
      const confirmSpy = vi.spyOn(window, 'confirm');
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));
      render(<MemoryRouter><OrdersPage /></MemoryRouter>);

      fireEvent.click(screen.getAllByRole('button', { name: 'Ações para o pedido #ABCDEF12' })[0]);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar pedido' }));
      expect(confirmSpy).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog', { name: 'Cancelar pedido #ABCDEF12?' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(document.activeElement).toHaveTextContent('Pedido #ABCDEF12 cancelado.'));
      expect(document.activeElement).toHaveAttribute('role', 'status');
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ status: 'CANCELED' });
      expect(refetch).toHaveBeenCalled();
    });

    it('Voltar no modal não cancela', () => {
      useApiMock.mockReturnValue({ data: [order], loading: false, error: null, refetch: vi.fn() });
      vi.stubGlobal('fetch', vi.fn());
      render(<MemoryRouter><OrdersPage /></MemoryRouter>);
      fireEvent.click(screen.getAllByRole('button', { name: 'Ações para o pedido #ABCDEF12' })[0]);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar pedido' }));
      fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('busca tem nome e a lista não tem violações de acessibilidade', async () => {
      useApiMock.mockReturnValue({ data: [{ ...order, refund_status: 'REQUESTED' }], loading: false, error: null, refetch: vi.fn() });
      const { container } = render(<MemoryRouter><OrdersPage /></MemoryRouter>);
      expect(screen.getByRole('searchbox', { name: 'Buscar pedidos por ID ou cliente' })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Pedidos' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Pedidos' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    describe('painel do pedido', () => {
      const detail = (status, extra = {}) => ({
        id: order.id,
        status,
        created_at: '2026-10-20T10:00:00Z',
        user: { name: 'Ana' },
        items: [],
        status_logs: [{ id: 'l1', new_status: 'PAID', created_at: '2026-10-20T10:00:00Z' }],
        subtotal: '200.00',
        shipping_cost: '0',
        total_amount: '200.00',
        ...extra,
      });

      // O painel lê o pedido de /api/orders/admin/<id>/; refetch troca pelo próximo da fila.
      function mockDetail(first, next) {
        let current = first;
        const refetch = vi.fn(() => { current = next; });
        useApiMock.mockImplementation((url) => (url === `/api/orders/admin/${order.id}/`
          ? { data: current, loading: false, error: null, refetch }
          : { data: [], loading: false, error: null, refetch: vi.fn() }));
        return refetch;
      }

      it('ao marcar como entregue, o botão some: foco no título e status anunciado', async () => {
        mockDetail(detail('SHIPPED'), detail('DELIVERED'));
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ status: 'DELIVERED' }) })));
        render(<MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}><OrdersPage /></MemoryRouter>);

        const button = screen.getByRole('button', { name: 'Marcar como entregue' });
        button.focus();
        fireEvent.click(button);
        await waitFor(() => expect(fetch).toHaveBeenCalled());

        await waitFor(() => expect(screen.queryByRole('button', { name: 'Marcar como entregue' })).not.toBeInTheDocument());
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Detalhes do Pedido' })));
        expect(screen.getAllByRole('status').some((el) => el.textContent === 'Status do pedido: Entregue.')).toBe(true);
      });

      it('erro da ação aparece dentro do painel', async () => {
        mockDetail(detail('PAID'), detail('PAID'));
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: async () => ({ message: 'Sem estoque.' }) })));
        render(<MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}><OrdersPage /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar preparação' }));
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Sem estoque.');
        expect(screen.getByRole('heading', { name: 'Detalhes do Pedido' }).closest('[aria-labelledby]')).toContainElement(alert);
      });

      it('histórico rola pelo teclado e é uma lista', () => {
        mockDetail(detail('PAID'), detail('PAID'));
        render(<MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}><OrdersPage /></MemoryRouter>);
        const region = screen.getByRole('region', { name: 'Histórico do pedido' });
        expect(region).toHaveAttribute('tabindex', '0');
        expect(within(region).getAllByRole('listitem')).toHaveLength(1);
      });
    });

    describe('e-mail de recuperação (#102)', () => {
      const makeListOrder = (status, extra = {}) => ({
        id: 'abcdef12-0000-0000-0000-000000000000',
        customer_name: 'Ana',
        created_at: '2026-11-10T15:00:00Z',
        total_amount: '200.00',
        status,
        ...extra,
      });

      const makeDetailOrder = (status, extra = {}) => ({
        id: order.id,
        status,
        created_at: '2026-11-10T15:00:00Z',
        user: { name: 'Ana', email: 'ana@example.com' },
        items: [],
        status_logs: [],
        recovery_email_sends: [],
        subtotal: '200.00',
        shipping_cost: '0',
        total_amount: '200.00',
        ...extra,
      });

      it.each(['AWAITING_PAYMENT', 'CANCELED'])('mostra ação de e-mail na lista para pedido %s e abre o modal', async (status) => {
        useApiMock.mockReturnValue({ data: [makeListOrder(status)], loading: false, error: null, refetch: vi.fn() });
        vi.stubGlobal('fetch', vi.fn((url) => {
          if (String(url).endsWith('/email/preview/')) return Promise.resolve({ ok: true, json: async () => ({ html: '<p>previa</p>' }) });
          return Promise.resolve({
            ok: true,
            json: async () => ({
              block_reason: null,
              unsubscribed: false,
              recipient: { name: 'Ana', email: 'ana@example.com' },
              order_status: status,
              suggested_message: 'Sugestão',
              history: [],
            }),
          });
        }));

        render(<MemoryRouter><OrdersPage /></MemoryRouter>);
        fireEvent.click(screen.getAllByRole('button', { name: 'Ações para o pedido #ABCDEF12' })[0]);
        const item = screen.getByRole('menuitem', { name: 'Enviar e-mail ao cliente' });
        expect(item).toBeInTheDocument();

        fireEvent.click(item);
        expect(await screen.findByRole('heading', { name: /Enviar e-mail — Pedido #ABCDEF12/ })).toBeInTheDocument();
        expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
      });

      it.each(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'])('não mostra ação de e-mail na lista para pedido %s', (status) => {
        useApiMock.mockReturnValue({ data: [makeListOrder(status)], loading: false, error: null, refetch: vi.fn() });
        render(<MemoryRouter><OrdersPage /></MemoryRouter>);

        fireEvent.click(screen.getAllByRole('button', { name: 'Ações para o pedido #ABCDEF12' })[0]);
        expect(screen.queryByRole('menuitem', { name: 'Enviar e-mail ao cliente' })).not.toBeInTheDocument();
      });

      it('mostra selo de data de envio na lista', () => {
        useApiMock.mockReturnValue({
          data: [makeListOrder('AWAITING_PAYMENT', { last_recovery_email_sent_at: '2026-11-12T15:00:00Z' })],
          loading: false,
          error: null,
          refetch: vi.fn(),
        });
        render(<MemoryRouter><OrdersPage /></MemoryRouter>);
        expect(screen.getAllByText('E-mail enviado em 12/11/2026')).toHaveLength(2);
      });

      it.each(['AWAITING_PAYMENT', 'CANCELED'])('mostra botão e histórico no detalhe para pedido %s', (status) => {
        const detailData = makeDetailOrder(status, {
          recovery_email_sends: [{ id: 'r1', sent_at: '2026-11-12T15:00:00Z', sent_by_name: 'Admin Pedidos', message: 'Oi' }],
        });
        useApiMock.mockImplementation((url) => (
          url === `/api/orders/admin/${order.id}/`
            ? { data: detailData, loading: false, error: null, refetch: vi.fn() }
            : { data: [], loading: false, error: null, refetch: vi.fn() }
        ));

        render(<MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}><OrdersPage /></MemoryRouter>);
        expect(screen.getByText('E-mail enviado em 12/11/2026 por Admin Pedidos')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar e-mail ao cliente' })).toBeInTheDocument();
      });

      it.each(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'])('não mostra botão de e-mail no detalhe para pedido %s', (status) => {
        const detailData = makeDetailOrder(status);
        useApiMock.mockImplementation((url) => (
          url === `/api/orders/admin/${order.id}/`
            ? { data: detailData, loading: false, error: null, refetch: vi.fn() }
            : { data: [], loading: false, error: null, refetch: vi.fn() }
        ));

        render(<MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}><OrdersPage /></MemoryRouter>);
        expect(screen.queryByRole('button', { name: 'Enviar e-mail ao cliente' })).not.toBeInTheDocument();
      });
    });
  });
});
