import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { requestExchange } from '../../../lib/exchanges';
import OrderDetailsPage from './index';

vi.mock('../../../components/layout/user/AccountLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: () => 'token',
}));

vi.mock('../../../lib/exchanges', async (importOriginal) => ({
  ...(await importOriginal()),
  requestExchange: vi.fn(),
}));

const eligibility = (overrides = {}) => ({
  can_request: true,
  code: null,
  message: null,
  size_or_color_deadline: '2026-11-20T02:59:59Z',
  defect_deadline: '2027-01-19T02:59:59Z',
  items: [{
    order_item_id: 'i1',
    available_quantity: 2,
    options: [{ variation_id: 'g', size: 'G', color: '', in_stock: true }],
  }],
  ...overrides,
});

const exchange = (overrides = {}) => ({
  id: 'e1',
  status: 'REQUESTED',
  reason: 'SIZE_OR_COLOR',
  reason_label: 'Tamanho ou cor',
  customer_comment: '',
  review_message: '',
  tracking_code: '',
  items: [{
    id: 'ei1',
    order_item_id: 'i1',
    product_name: 'Jaqueta',
    variation: { size: 'M', color: '' },
    replacement_variation: { size: 'G', color: '' },
    quantity: 1,
    condition: '',
    condition_label: '',
  }],
  created_at: '2026-10-20T10:00:00Z',
  reviewed_at: null,
  received_at: null,
  completed_at: null,
  canceled_at: null,
  ...overrides,
});

const order = (overrides = {}) => ({
  id: 'abcdef12-0000-0000-0000-000000000000',
  status: 'DELIVERED',
  created_at: '2026-10-10T10:00:00Z',
  items: [{ id: 'i1', product_id: 'p1', product_name: 'Jaqueta', sku_snapshot: 'J-M', quantity: 2, unit_price: '100.00' }],
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
  refund_eligibility: { can_request: false, code: 'exchange_exists', message: 'x', deadline: null },
  exchanges: [],
  exchange_eligibility: eligibility(),
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

const section = (title) => screen.getByRole('heading', { name: title }).parentElement;

describe('OrderDetailsPage — troca', () => {
  it('cliente solicita a troca e acompanha o status', async () => {
    requestExchange.mockResolvedValueOnce(order({
      exchanges: [exchange()],
      exchange_eligibility: eligibility({ can_request: false, code: 'exchange_in_progress', message: 'x', items: [] }),
    }));
    mount(order());

    expect(await screen.findByText(/Troca por tamanho ou cor até 19\/11\/2026/)).toBeInTheDocument();
    // Com troca possível, o reembolso bloqueado por ela não aparece.
    expect(screen.queryByRole('heading', { name: 'Reembolso' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar troca' }));
    const modal = screen.getByRole('dialog', { name: 'Solicitar troca' });
    fireEvent.click(within(modal).getByRole('radio', { name: /Tamanho ou cor/ }));
    fireEvent.click(within(modal).getByLabelText('Jaqueta'));
    fireEvent.change(within(modal).getAllByRole('combobox')[1], { target: { value: 'g' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Solicitar troca' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const panel = section('Troca');
    expect(within(panel).getByText('Troca solicitada')).toBeInTheDocument();
    expect(within(panel).getByText(/Não envie a peça antes da aprovação/)).toBeInTheDocument();
    expect(within(panel).getByText('G')).toBeInTheDocument();
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument();
    expect(within(section('Histórico do Pedido')).getByText('Troca solicitada')).toBeInTheDocument();
  });

  it('mostra instruções, rastreio e permite trocar o restante', async () => {
    mount(order({
      exchanges: [
        exchange({
          status: 'COMPLETED',
          reviewed_at: '2026-10-21T10:00:00Z',
          received_at: '2026-10-25T10:00:00Z',
          completed_at: '2026-10-26T10:00:00Z',
          tracking_code: 'BR123',
        }),
      ],
      exchange_eligibility: eligibility({
        items: [{ order_item_id: 'i1', available_quantity: 1, options: [] }],
      }),
    }));
    await screen.findByText('Troca concluída');
    const panel = section('Troca');
    expect(within(panel).getByText('BR123')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Trocar outro item' })).toBeInTheDocument();
    const history = section('Histórico do Pedido');
    for (const label of ['Troca solicitada', 'Troca aprovada', 'Peça da troca recebida', 'Nova peça enviada']) {
      expect(within(history).getByText(label)).toBeInTheDocument();
    }
  });

  it('mostra a mensagem de aprovação e a justificativa da recusa', async () => {
    const { unmount } = mount(order({
      exchanges: [exchange({ status: 'APPROVED', reviewed_at: '2026-10-21T10:00:00Z', review_message: 'Envie para a Rua X' })],
      exchange_eligibility: eligibility({ can_request: false, code: 'exchange_in_progress', message: 'x', items: [] }),
    }));
    expect(await screen.findByText('Como enviar a peça')).toBeInTheDocument();
    expect(screen.getByText('Envie para a Rua X')).toBeInTheDocument();
    unmount();

    mount(order({
      exchanges: [exchange({ status: 'REJECTED', reviewed_at: '2026-10-21T10:00:00Z', review_message: 'Peça usada' })],
      exchange_eligibility: eligibility({
        can_request: false, code: 'exchange_rejected', message: 'O pedido de troca foi recusado. Fale com a loja.', items: [],
      }),
    }));
    expect(await screen.findByText('Justificativa da loja')).toBeInTheDocument();
    expect(screen.getByText('O pedido de troca foi recusado. Fale com a loja.')).toBeInTheDocument();
  });

  it('explica prazo vencido e esconde a troca antes da entrega', async () => {
    const { unmount } = mount(order({
      exchange_eligibility: eligibility({
        can_request: false, code: 'deadline_passed', message: 'O prazo de troca terminou. Fale com a loja.', items: [],
      }),
    }));
    expect(await screen.findByText('O prazo de troca terminou. Fale com a loja.')).toBeInTheDocument();
    unmount();

    mount(order({
      status: 'SHIPPED',
      refund_eligibility: { can_request: false, code: 'order_in_transit', message: 'Aguarde', deadline: null },
      exchange_eligibility: eligibility({ can_request: false, code: 'order_not_delivered', message: 'x', items: [] }),
    }));
    await screen.findByText('Rastreamento');
    expect(screen.queryByRole('heading', { name: 'Troca' })).not.toBeInTheDocument();
  });
});
