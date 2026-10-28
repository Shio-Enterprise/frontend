import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { requestRefund } from '../../../lib/refunds';
import OrderDetailsPage from './index';

vi.mock('../../../components/layout/user/AccountLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: () => 'token',
}));

vi.mock('../../../lib/refunds', async (importOriginal) => ({
  ...(await importOriginal()),
  requestRefund: vi.fn(),
}));

const order = (overrides = {}) => ({
  id: 'abcdef12-0000-0000-0000-000000000000',
  status: 'DELIVERED',
  created_at: '2026-10-10T10:00:00Z',
  items: [],
  status_logs: [],
  tracking_code: null,
  payment: { method: 'PIX', status: 'PAID' },
  subtotal: '200.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  total_amount: '200.00',
  shipping_street: 'Rua A',
  shipping_number: '1',
  shipping_complement: '',
  shipping_neighborhood: 'Centro',
  shipping_city: 'Brasília',
  shipping_state: 'DF',
  shipping_zip_code: '70000-000',
  refund: null,
  refund_eligibility: { can_request: false, code: null, message: null, deadline: null },
  ...overrides,
});

const refund = (overrides = {}) => ({
  id: 'r1',
  status: 'REQUESTED',
  status_label: 'Solicitado',
  amount: '200.00',
  reason: 'CUSTOMER_REQUEST',
  reason_label: 'Desistência do cliente',
  customer_comment: '',
  review_message: '',
  refunded_at: null,
  created_at: '2026-10-12T10:00:00Z',
  reviewed_at: null,
  ...overrides,
});

const mount = (data) => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => data })));
  return render(
    <MemoryRouter initialEntries={['/my-orders/abcdef12']}>
      <Routes>
        <Route path="/my-orders/:id" element={<OrderDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrderDetailsPage — reembolso', () => {
  it('cliente solicita o reembolso dentro do prazo', async () => {
    const eligible = order({
      refund_eligibility: { can_request: true, code: null, message: null, deadline: '2026-10-18T02:59:59Z' },
    });
    requestRefund.mockResolvedValueOnce(order({
      refund: refund({ customer_comment: 'Não serviu' }),
      refund_eligibility: { can_request: false, code: 'refund_in_progress', message: 'x', deadline: null },
    }));
    mount(eligible);

    expect(await screen.findByText('Você pode solicitar o reembolso até 17/10/2026.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar reembolso' }));
    const modal = screen.getByRole('dialog', { name: 'Solicitar reembolso' });
    expect(within(modal).getByText(/instruções para devolver o produto/)).toBeInTheDocument();
    const submit = within(modal).getByRole('button', { name: 'Solicitar reembolso' });

    fireEvent.click(within(modal).getByRole('radio', { name: 'Outro' }));
    expect(submit).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText('Conte o motivo (obrigatório)'), {
      target: { value: ' Não serviu ' },
    });
    fireEvent.click(submit);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(requestRefund).toHaveBeenCalledWith(eligible.id, { reason: 'OTHER', comment: 'Não serviu' });
    expect(screen.getAllByText('Reembolso solicitado').length).toBeGreaterThan(0);
    expect(screen.getByText(/em análise pela loja/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar reembolso' })).not.toBeInTheDocument();
  });

  it('mostra o erro do backend na solicitação', async () => {
    requestRefund.mockRejectedValueOnce({
      response: { data: { message: 'O prazo de 7 dias após a entrega terminou. Fale com a loja.' } },
    });
    mount(order({ status: 'PAID', refund_eligibility: { can_request: true, code: null, message: null, deadline: null } }));

    fireEvent.click(await screen.findByRole('button', { name: 'Solicitar reembolso' }));
    const modal = screen.getByRole('dialog', { name: 'Solicitar reembolso' });
    expect(within(modal).getByText(/a compra é cancelada e não será enviada/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('radio', { name: 'Desisti da compra' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Solicitar reembolso' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('O prazo de 7 dias');
  });

  it('explica o prazo vencido e esconde o reembolso em transporte', async () => {
    const { unmount } = mount(order({
      refund_eligibility: {
        can_request: false,
        code: 'deadline_passed',
        message: 'O prazo de 7 dias após a entrega terminou. Fale com a loja.',
        deadline: '2026-10-18T02:59:59Z',
      },
    }));
    expect(await screen.findByText('O prazo de 7 dias após a entrega terminou. Fale com a loja.')).toBeInTheDocument();
    unmount();

    mount(order({
      status: 'SHIPPED',
      refund_eligibility: { can_request: false, code: 'order_in_transit', message: 'Aguarde', deadline: null },
    }));
    await screen.findByText('Rastreamento');
    expect(screen.queryByText('Reembolso')).not.toBeInTheDocument();
  });

  it('mostra recusa com justificativa e reembolso concluído na linha do tempo', async () => {
    const { unmount } = mount(order({
      refund: refund({ status: 'REJECTED', reviewed_at: '2026-10-13T10:00:00Z', review_message: 'Produto usado' }),
    }));
    expect(await screen.findByText('Justificativa da loja')).toBeInTheDocument();
    // No quadro do reembolso e no evento de recusa da linha do tempo.
    expect(screen.getAllByText('Produto usado')).toHaveLength(2);
    unmount();

    mount(order({
      payment: { method: 'PIX', status: 'REFUNDED' },
      refund: refund({
        status: 'COMPLETED',
        reviewed_at: '2026-10-13T10:00:00Z',
        refunded_at: '2026-10-14T10:00:00Z',
        completed_at: '2026-10-14T11:00:00Z',
      }),
    }));
    expect(await screen.findByText(/Estorno de/)).toHaveTextContent('R$ 200,00');
    expect(screen.getByText(/depende do seu banco/)).toBeInTheDocument();
    const history = screen.getByRole('heading', { name: 'Histórico do Pedido' }).parentElement;
    for (const label of ['Reembolso solicitado', 'Reembolso aprovado', 'Reembolsado']) {
      expect(within(history).getByText(label)).toBeInTheDocument();
    }
  });
});
