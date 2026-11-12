import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import OrdersPage from './index';

const { useApiMock, downloadFileMock } = vi.hoisted(() => ({ useApiMock: vi.fn(), downloadFileMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

vi.mock('../../../lib/downloadFile', () => ({
  downloadFile: downloadFileMock,
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

  describe('busca pelo código do pedido (#89)', () => {
    const orders = [
      { id: '54974a89-1111-2222-3333-444444444444', customer_name: 'Maria Silva', created_at: '2026-10-20T10:00:00Z', total_amount: '100.00', status: 'PAID' },
      { id: 'abcdef12-0000-0000-0000-000000000000', customer_name: 'João Souza', created_at: '2026-10-21T10:00:00Z', total_amount: '50.00', status: 'PAID' },
    ];

    beforeEach(() => {
      useApiMock.mockReturnValue({ data: orders, loading: false, error: null, refetch: vi.fn() });
    });

    const searchFor = (term) => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedidos por ID ou cliente' }), { target: { value: term } });
    };
    const table = () => screen.getByRole('table', { name: 'Pedidos' });

    it.each(['#54974A89', '54974A89', '54974a89', '#54974a89', '  #54974A89  ', '54974'])(
      'buscar "%s" encontra o pedido como aparece na tela',
      (term) => {
        render(<MemoryRouter><OrdersPage /></MemoryRouter>);
        searchFor(term);
        expect(within(table()).getByText('#54974A89')).toBeInTheDocument();
        expect(within(table()).queryByText('#ABCDEF12')).not.toBeInTheDocument();
      },
    );

    it('busca pelo nome do cliente sem diferenciar maiúsculas', () => {
      render(<MemoryRouter><OrdersPage /></MemoryRouter>);
      searchFor('JOÃO');
      expect(within(table()).getByText('#ABCDEF12')).toBeInTheDocument();
      expect(within(table()).queryByText('#54974A89')).not.toBeInTheDocument();
    });

    it('busca sem resultado mostra "Nenhum pedido encontrado"', () => {
      render(<MemoryRouter><OrdersPage /></MemoryRouter>);
      searchFor('#ZZZZ');
      expect(screen.getByText('Nenhum pedido encontrado.')).toBeInTheDocument();
    });
  });

  describe('filtro por cliente (#88)', () => {
    const mariaOrder = { id: '54974a89-1111-2222-3333-444444444444', customer_name: 'Maria Silva', created_at: '2026-10-20T10:00:00Z', total_amount: '100.00', status: 'PAID' };

    function LocationProbe() {
      const location = useLocation();
      const navigate = useNavigate();
      return (
        <>
          <p data-testid="location">{location.pathname + location.search}</p>
          <button type="button" onClick={() => navigate('/admin/orders?customer=9')}>ir para outro cliente</button>
        </>
      );
    }

    const renderAt = (entry) => render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin/orders/*" element={<><OrdersPage /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    it('lê o cliente do endereço e pede só os pedidos dele', () => {
      useApiMock.mockReturnValue({ data: [mariaOrder], loading: false, error: null, refetch: vi.fn() });
      renderAt('/admin/orders?customer=7');
      expect(useApiMock).toHaveBeenCalledWith('/api/orders/admin/?customer=7');
      expect(screen.getByText('Pedidos de Maria Silva')).toBeInTheDocument();
    });

    it('combina com os filtros de reembolso e troca', () => {
      renderAt('/admin/orders?customer=7');
      fireEvent.change(screen.getByLabelText('Filtrar por reembolso'), { target: { value: 'REQUESTED' } });
      fireEvent.change(screen.getByLabelText('Filtrar por troca'), { target: { value: 'RECEIVED' } });
      expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/?customer=7&refund_status=REQUESTED&exchange_status=RECEIVED');
    });

    it('cliente sem pedidos mostra o filtro e "Nenhum pedido encontrado"', () => {
      renderAt('/admin/orders?customer=7');
      expect(screen.getByText('Pedidos do cliente selecionado')).toBeInTheDocument();
      expect(screen.getByText('Nenhum pedido encontrado.')).toBeInTheDocument();
    });

    it('limpar o filtro volta a mostrar todos e leva o foco para a busca', () => {
      useApiMock.mockReturnValue({ data: [mariaOrder], loading: false, error: null, refetch: vi.fn() });
      renderAt('/admin/orders?customer=7');
      fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro de cliente' }));
      expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/');
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/orders$/);
      expect(screen.queryByText('Pedidos de Maria Silva')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Buscar pedidos por ID ou cliente' }));
    });

    it.each(['abc', '0', '-3', '1.5'])('valor inválido (%s) é ignorado e não quebra a tela', (value) => {
      renderAt(`/admin/orders?customer=${value}`);
      expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/');
      expect(screen.queryByRole('button', { name: 'Limpar filtro de cliente' })).not.toBeInTheDocument();
    });

    it('abrir e fechar o pedido mantém o filtro no endereço', () => {
      useApiMock.mockReturnValue({ data: [mariaOrder], loading: false, error: null, refetch: vi.fn() });
      renderAt('/admin/orders?customer=7');
      fireEvent.click(screen.getAllByRole('button', { name: 'Ações para o pedido #54974A89' })[0]);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Ver detalhes' }));
      expect(screen.getByTestId('location')).toHaveTextContent(`/admin/orders/${mariaOrder.id}?customer=7`);
      // O painel tem o "x" do topo e o "Fechar" do rodapé; os dois fecham.
      fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1));
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/orders\?customer=7$/);
    });

    it('exportar com o filtro ativo envia o cliente', async () => {
      downloadFileMock.mockResolvedValue();
      renderAt('/admin/orders?customer=7');
      fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
      fireEvent.click(screen.getByRole('menuitem', { name: /CSV/ }));
      await waitFor(() => expect(downloadFileMock).toHaveBeenCalled());
      expect(downloadFileMock.mock.lastCall[1]).toEqual({ customer: '7', file_format: 'csv' });
    });

    it('filtro de cliente e busca funcionam juntos, e a exportação leva os dois', async () => {
      const other = { ...mariaOrder, id: 'abcdef12-0000-0000-0000-000000000000' };
      useApiMock.mockReturnValue({ data: [mariaOrder, other], loading: false, error: null, refetch: vi.fn() });
      downloadFileMock.mockResolvedValue();
      renderAt('/admin/orders?customer=7');
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedidos por ID ou cliente' }), { target: { value: '#54974A89' } });
      const table = screen.getByRole('table', { name: 'Pedidos' });
      expect(within(table).getByText('#54974A89')).toBeInTheDocument();
      expect(within(table).queryByText('#ABCDEF12')).not.toBeInTheDocument();
      expect(screen.getByText('Pedidos de Maria Silva')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
      fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }));
      await waitFor(() => expect(downloadFileMock).toHaveBeenCalled());
      expect(downloadFileMock.mock.lastCall[1]).toEqual({ customer: '7', search: '#54974A89', file_format: 'xlsx' });
    });

    it('o chip guarda o nome quando os outros filtros esvaziam a lista', () => {
      useApiMock.mockImplementation((url) => ({
        data: url.includes('refund_status') ? [] : [mariaOrder],
        loading: false, error: null, refetch: vi.fn(),
      }));
      renderAt('/admin/orders?customer=7');
      fireEvent.change(screen.getByLabelText('Filtrar por reembolso'), { target: { value: 'REQUESTED' } });
      expect(screen.getByText('Nenhum pedido encontrado.')).toBeInTheDocument();
      expect(screen.getByText('Pedidos de Maria Silva')).toBeInTheDocument();
    });

    it('trocar de cliente não reaproveita o nome do anterior', () => {
      useApiMock.mockImplementation((url) => ({
        data: url.includes('customer=7') ? [mariaOrder] : [],
        loading: false, error: null, refetch: vi.fn(),
      }));
      renderAt('/admin/orders?customer=7');
      expect(screen.getByText('Pedidos de Maria Silva')).toBeInTheDocument();
      // Navega para outro cliente sem desmontar a página (como o "Voltar" do navegador).
      fireEvent.click(screen.getByRole('button', { name: 'ir para outro cliente' }));
      expect(screen.getByText('Pedidos do cliente selecionado')).toBeInTheDocument();
    });

    it('enquanto carrega o novo cliente, não mostra o nome do anterior', () => {
      // useApi mantém a resposta antiga enquanto busca a nova URL.
      useApiMock.mockImplementation((url) => ({
        data: [mariaOrder], loading: !url.includes('customer=7'), error: null, refetch: vi.fn(),
      }));
      renderAt('/admin/orders?customer=7');
      fireEvent.click(screen.getByRole('button', { name: 'ir para outro cliente' }));
      expect(screen.queryByText('Pedidos de Maria Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Pedidos do cliente selecionado')).toBeInTheDocument();
    });

    it('cliente sem nome aparece pelo e-mail no chip', () => {
      // A API já manda o e-mail em customer_name quando o cliente não tem nome.
      useApiMock.mockReturnValue({ data: [{ ...mariaOrder, customer_name: 'maria@x.com' }], loading: false, error: null, refetch: vi.fn() });
      renderAt('/admin/orders?customer=7');
      expect(screen.getByText('Pedidos de maria@x.com')).toBeInTheDocument();
    });

    it('erro da API com o filtro mostra a mensagem e mantém o botão de limpar', () => {
      useApiMock.mockReturnValue({ data: null, loading: false, error: new Error('400'), refetch: vi.fn() });
      renderAt('/admin/orders?customer=7');
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao carregar pedidos.');
      expect(screen.getByRole('button', { name: 'Limpar filtro de cliente' })).toBeInTheDocument();
    });

    it('chip do filtro não tem violações de acessibilidade', async () => {
      useApiMock.mockReturnValue({ data: [mariaOrder], loading: false, error: null, refetch: vi.fn() });
      const { container } = renderAt('/admin/orders?customer=7');
      expect(await axe(container)).toHaveNoViolations();
    });
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
  });
});
