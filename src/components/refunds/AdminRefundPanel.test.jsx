import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveRefund, completeRefund, rejectRefund } from '../../lib/refunds';
import AdminRefundPanel from './AdminRefundPanel';

vi.mock('../../lib/refunds', async (importOriginal) => ({
  ...(await importOriginal()),
  approveRefund: vi.fn(),
  rejectRefund: vi.fn(),
  completeRefund: vi.fn(),
}));

const refund = (overrides = {}) => ({
  id: 'r1',
  status: 'REQUESTED',
  amount: '200.00',
  reason: 'CUSTOMER_REQUEST',
  reason_label: 'Desistência do cliente',
  customer_comment: 'Não serviu',
  review_message: '',
  internal_note: '',
  gateway_reference: '',
  refunded_at: null,
  created_at: '2026-10-20T10:00:00Z',
  reviewed_at: null,
  completed_at: null,
  reviewed_by: null,
  completed_by: null,
  stock_returned: false,
  ...overrides,
});

const order = (overrides = {}) => ({
  id: 'o1',
  status: 'PREPARING',
  total_amount: '200.00',
  payment: { status: 'PAID', total_amount: '200.00' },
  refund: null,
  ...overrides,
});

const mount = (data, onChanged = vi.fn()) => {
  render(<AdminRefundPanel order={data} onChanged={onChanged} />);
  return onChanged;
};

const fillCompletion = (modal) => {
  fireEvent.change(within(modal).getByLabelText('Referência do estorno na InfinitePay'), {
    target: { value: 'Estorno 123' },
  });
  fireEvent.click(within(modal).getByLabelText('Confirmo que o estorno já foi feito no painel da InfinitePay.'));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminRefundPanel', () => {
  it('não aparece sem reembolso e sem pagamento confirmado', () => {
    const { container } = render(
      <AdminRefundPanel order={order({ payment: { status: 'PENDING' } })} onChanged={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o pedido do cliente com as ações de análise e o aviso de envio bloqueado', () => {
    mount(order({ refund: refund() }));
    expect(screen.getByText('Reembolso solicitado')).toBeInTheDocument();
    expect(screen.getByText('Não serviu')).toBeInTheDocument();
    expect(screen.getByText('O envio fica bloqueado até a análise do reembolso.')).toBeInTheDocument();
    for (const name of ['Aprovar', 'Recusar', 'Registrar estorno']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('recusa exige justificativa', async () => {
    rejectRefund.mockResolvedValueOnce({});
    const onChanged = mount(order({ refund: refund() }));
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    const modal = screen.getByRole('dialog', { name: 'Recusar reembolso' });
    const submit = within(modal).getByRole('button', { name: 'Recusar' });
    expect(submit).toBeDisabled();

    fireEvent.change(within(modal).getByLabelText('Justificativa (obrigatória)'), {
      target: { value: '  Produto usado  ' },
    });
    fireEvent.click(submit);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(rejectRefund).toHaveBeenCalledWith('o1', { message: 'Produto usado' });
  });

  it('aprova com mensagem opcional e avisa que o pedido não enviado será cancelado', async () => {
    approveRefund.mockResolvedValueOnce({});
    const onChanged = mount(order({ refund: refund() }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    const modal = screen.getByRole('dialog', { name: 'Aprovar reembolso' });
    expect(within(modal).getByText(/ao aprovar, ele é cancelado/)).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(approveRefund).toHaveBeenCalledWith('o1', { message: '' });
  });

  it('registro do estorno exige referência e confirmação', async () => {
    completeRefund.mockResolvedValueOnce({});
    const onChanged = mount(order({ status: 'DELIVERED', refund: refund({ status: 'APPROVED' }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar estorno' }));
    const modal = screen.getByRole('dialog', { name: 'Registrar estorno' });
    const submit = within(modal).getByRole('button', { name: 'Registrar' });
    expect(within(modal).queryByLabelText('Motivo')).not.toBeInTheDocument();
    expect(submit).toBeDisabled();

    fillCompletion(modal);
    fireEvent.click(within(modal).getByLabelText('Os itens voltaram para a loja e entram no estoque.'));
    fireEvent.click(submit);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(completeRefund).toHaveBeenCalledWith('o1', expect.objectContaining({
      gateway_reference: 'Estorno 123',
      items_returned: true,
      internal_note: '',
    }));
    expect(completeRefund.mock.calls[0][1]).not.toHaveProperty('reason');
  });

  it('registro direto de pedido enviado exige motivo e retorno do pacote', async () => {
    completeRefund.mockResolvedValueOnce({});
    mount(order({ status: 'SHIPPED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar reembolso' }));
    const modal = screen.getByRole('dialog', { name: 'Registrar reembolso' });
    const submit = within(modal).getByRole('button', { name: 'Registrar' });
    expect(within(modal).queryByRole('option', { name: 'Pagamento após cancelamento' })).not.toBeInTheDocument();

    fillCompletion(modal);
    fireEvent.change(within(modal).getByLabelText('Motivo'), { target: { value: 'DELIVERY_ISSUE' } });
    expect(submit).toBeDisabled();

    fireEvent.click(within(modal).getByLabelText(/O pacote voltou para a loja/));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(completeRefund).toHaveBeenCalledWith('o1', expect.objectContaining({
      reason: 'DELIVERY_ISSUE',
      items_returned: true,
    })));
  });

  it('mostra o erro do backend no modal', async () => {
    completeRefund.mockRejectedValueOnce({
      response: { data: { message: 'Este pedido já tem um reembolso.', code: 'refund_in_progress' } },
    });
    const onChanged = mount(order({ status: 'CANCELED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar reembolso' }));
    const modal = screen.getByRole('dialog', { name: 'Registrar reembolso' });
    fillCompletion(modal);
    fireEvent.change(within(modal).getByLabelText('Motivo'), { target: { value: 'PAID_AFTER_CANCELLATION' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Registrar' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('Este pedido já tem um reembolso.');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('mostra os dados do estorno concluído sem ações', () => {
    mount(order({
      status: 'DELIVERED',
      payment: { status: 'REFUNDED' },
      refund: refund({
        status: 'COMPLETED',
        gateway_reference: 'REF-1',
        refunded_at: '2026-10-21T10:00:00Z',
        stock_returned: true,
        internal_note: 'Cliente devolveu',
      }),
    }));
    expect(screen.getByText('Reembolsado')).toBeInTheDocument();
    expect(screen.getByText('REF-1')).toBeInTheDocument();
    expect(screen.getByText('Cliente devolveu')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
