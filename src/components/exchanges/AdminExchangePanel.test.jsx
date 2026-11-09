import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveExchange,
  cancelExchange,
  completeExchange,
  receiveExchange,
  rejectExchange,
} from '../../lib/exchanges';
import AdminExchangePanel from './AdminExchangePanel';

vi.mock('../../lib/exchanges', async (importOriginal) => ({
  ...(await importOriginal()),
  approveExchange: vi.fn(),
  rejectExchange: vi.fn(),
  receiveExchange: vi.fn(),
  completeExchange: vi.fn(),
  cancelExchange: vi.fn(),
}));

const item = (overrides = {}) => ({
  id: 'ei1',
  order_item_id: 'i1',
  product_name: 'Jaqueta',
  variation: { id: 'm', size: 'M', color: '' },
  replacement_variation: { id: 'g', size: 'G', color: '' },
  quantity: 1,
  condition: '',
  condition_label: '',
  ...overrides,
});

const exchange = (overrides = {}) => ({
  id: 'e1',
  status: 'REQUESTED',
  reason: 'DEFECT',
  reason_label: 'Defeito',
  customer_comment: 'Costura abriu',
  review_message: '',
  internal_note: '',
  tracking_code: '',
  items: [item()],
  created_at: '2026-10-20T10:00:00Z',
  reviewed_at: null,
  received_at: null,
  completed_at: null,
  canceled_at: null,
  reviewed_by: null,
  received_by: null,
  completed_by: null,
  canceled_by: null,
  ...overrides,
});

const mount = (exchanges) => {
  const onChanged = vi.fn();
  render(<AdminExchangePanel order={{ id: 'o1', exchanges }} onChanged={onChanged} />);
  return onChanged;
};

const buttons = () => screen.queryAllByRole('button').map((button) => button.textContent);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminExchangePanel', () => {
  it('não aparece sem troca', () => {
    const { container } = render(<AdminExchangePanel order={{ id: 'o1', exchanges: [] }} onChanged={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra só as ações do status atual', () => {
    const cases = [
      ['REQUESTED', ['Aprovar', 'Recusar', 'Cancelar troca']],
      ['APPROVED', ['Confirmar recebimento', 'Cancelar troca']],
      ['RECEIVED', ['Registrar envio']],
      ['COMPLETED', []],
      ['REJECTED', []],
      ['CANCELED', []],
    ];
    for (const [status, expected] of cases) {
      const { unmount } = render(
        <AdminExchangePanel order={{ id: 'o1', exchanges: [exchange({ status })] }} onChanged={vi.fn()} />,
      );
      expect(buttons()).toEqual(expected);
      unmount();
    }
  });

  it('mostra os dados da troca, inclusive os internos e o histórico', () => {
    mount([
      exchange({
        status: 'COMPLETED',
        reviewed_at: '2026-10-21T10:00:00Z',
        received_at: '2026-10-25T10:00:00Z',
        completed_at: '2026-10-26T10:00:00Z',
        reviewed_by: { name: 'Bia', email: 'bia@shio.com' },
        tracking_code: 'BR123',
        internal_note: 'Peça manchada',
        items: [item({ condition: 'LOSS', condition_label: 'Perda/avaria' })],
      }),
      exchange({ id: 'old', status: 'CANCELED', canceled_at: '2026-10-19T10:00:00Z', review_message: 'Acabou' }),
    ]);
    expect(screen.getByText('Troca concluída')).toBeInTheDocument();
    expect(screen.getByText('Troca cancelada')).toBeInTheDocument();
    expect(screen.getByText('BR123')).toBeInTheDocument();
    expect(screen.getByText('Peça manchada')).toBeInTheDocument();
    expect(screen.getByText('(Perda/avaria)')).toBeInTheDocument();
    expect(screen.getByText(/Bia/)).toBeInTheDocument();
    expect(screen.getByText('Acabou')).toBeInTheDocument();
  });

  it('aprova com instruções opcionais', async () => {
    approveExchange.mockResolvedValueOnce({});
    const onChanged = mount([exchange()]);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    const modal = screen.getByRole('dialog', { name: 'Aprovar troca' });
    expect(within(modal).getByText(/a nova peça sai do estoque/)).toBeInTheDocument();
    fireEvent.change(within(modal).getByLabelText(/Instruções de envio/), { target: { value: ' Rua X ' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(approveExchange).toHaveBeenCalledWith('o1', { message: 'Rua X' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recusa e cancelamento exigem justificativa', async () => {
    for (const [button, title, action] of [
      ['Recusar', 'Recusar troca', rejectExchange],
      ['Cancelar troca', 'Cancelar troca', cancelExchange],
    ]) {
      action.mockResolvedValueOnce({});
      const { unmount } = render(
        <AdminExchangePanel order={{ id: 'o1', exchanges: [exchange()] }} onChanged={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole('button', { name: button }));
      const modal = screen.getByRole('dialog', { name: title });
      const submit = within(modal).getAllByRole('button').at(-1);
      expect(submit).toBeDisabled();
      fireEvent.change(within(modal).getByRole('textbox'), { target: { value: 'Peça usada' } });
      fireEvent.click(submit);
      await waitFor(() => expect(action).toHaveBeenCalledWith('o1', { message: 'Peça usada' }));
      unmount();
    }
  });

  it('recebimento exige a condição de cada peça', async () => {
    receiveExchange.mockResolvedValueOnce({});
    const onChanged = mount([
      exchange({
        status: 'APPROVED',
        items: [item(), item({ id: 'ei2', product_name: 'Boné', quantity: 2 })],
      }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recebimento' }));
    const modal = screen.getByRole('dialog', { name: 'Confirmar recebimento' });
    const submit = within(modal).getByRole('button', { name: 'Confirmar' });
    const [first, second] = within(modal).getAllByRole('combobox');

    fireEvent.change(first, { target: { value: 'RESTOCK' } });
    expect(submit).toBeDisabled();
    fireEvent.change(second, { target: { value: 'LOSS' } });
    fireEvent.change(within(modal).getByLabelText('Observação interna (opcional)'), { target: { value: 'Manchada' } });
    fireEvent.click(submit);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(receiveExchange).toHaveBeenCalledWith('o1', {
      items: [
        { id: 'ei1', condition: 'RESTOCK' },
        { id: 'ei2', condition: 'LOSS' },
      ],
      internal_note: 'Manchada',
    });
  });

  it('envio exige rastreio e mostra o erro do backend', async () => {
    completeExchange.mockRejectedValueOnce({
      response: { data: { message: 'Confirme o recebimento da peça antes do envio.' } },
    });
    const onChanged = mount([exchange({ status: 'RECEIVED' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar envio' }));
    const modal = screen.getByRole('dialog', { name: 'Registrar envio da nova peça' });
    const submit = within(modal).getByRole('button', { name: 'Registrar envio' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText('Código de rastreio'), { target: { value: ' BR1 ' } });
    fireEvent.click(submit);

    expect(await within(modal).findByRole('alert')).toHaveTextContent('Confirme o recebimento');
    expect(completeExchange).toHaveBeenCalledWith('o1', { tracking_code: 'BR1' });
    expect(onChanged).not.toHaveBeenCalled();
  });
});
