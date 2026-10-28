import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestExchange } from '../../lib/exchanges';
import ExchangeRequestModal from './ExchangeRequestModal';

vi.mock('../../lib/exchanges', async (importOriginal) => ({
  ...(await importOriginal()),
  requestExchange: vi.fn(),
}));

const order = (eligibility = {}) => ({
  id: 'o1',
  items: [
    { id: 'i1', product_name: 'Jaqueta', quantity: 2 },
    { id: 'i2', product_name: 'Boné', quantity: 1 },
  ],
  exchange_eligibility: {
    can_request: true,
    size_or_color_deadline: '2026-11-20T02:59:59Z',
    defect_deadline: '2027-01-19T02:59:59Z',
    items: [
      {
        order_item_id: 'i1',
        available_quantity: 2,
        options: [
          { variation_id: 'g', size: 'G', color: 'Preto', in_stock: true },
          { variation_id: 'p', size: 'P', color: '', in_stock: false },
        ],
      },
      { order_item_id: 'i2', available_quantity: 1, options: [] },
    ],
    ...eligibility,
  },
});

const mount = (data = order()) => {
  const props = { onClose: vi.fn(), onRequested: vi.fn() };
  render(<ExchangeRequestModal order={data} {...props} />);
  return { ...props, modal: screen.getByRole('dialog', { name: 'Solicitar troca' }) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ExchangeRequestModal', () => {
  it('envia itens, quantidade e variação escolhidos', async () => {
    const updated = { id: 'o1', exchanges: [{ id: 'e1' }] };
    requestExchange.mockResolvedValueOnce(updated);
    const { modal, onRequested } = mount();
    const submit = within(modal).getByRole('button', { name: 'Solicitar troca' });
    expect(submit).toBeDisabled();

    fireEvent.click(within(modal).getByRole('radio', { name: /Tamanho ou cor/ }));
    fireEvent.click(within(modal).getByLabelText('Jaqueta'));
    expect(submit).toBeDisabled();

    const [quantity, replacement] = within(modal).getAllByRole('combobox');
    expect(within(quantity).getAllByRole('option').map((o) => o.value)).toEqual(['1', '2']);
    expect(within(replacement).getByRole('option', { name: 'P (esgotado)' })).toBeDisabled();
    fireEvent.change(quantity, { target: { value: '2' } });
    fireEvent.change(replacement, { target: { value: 'g' } });
    fireEvent.change(within(modal).getByLabelText('Comentário (opcional)'), { target: { value: ' Ficou justa ' } });
    fireEvent.click(submit);

    await waitFor(() => expect(onRequested).toHaveBeenCalledWith(updated));
    expect(requestExchange).toHaveBeenCalledWith('o1', {
      reason: 'SIZE_OR_COLOR',
      comment: 'Ficou justa',
      items: [{ order_item_id: 'i1', replacement_variation_id: 'g', quantity: 2 }],
    });
  });

  it('defeito exige descrição', () => {
    const { modal } = mount();
    fireEvent.click(within(modal).getByRole('radio', { name: /Defeito/ }));
    fireEvent.click(within(modal).getByLabelText('Jaqueta'));
    fireEvent.change(within(modal).getAllByRole('combobox')[1], { target: { value: 'g' } });
    const submit = within(modal).getByRole('button', { name: 'Solicitar troca' });
    expect(submit).toBeDisabled();

    fireEvent.change(within(modal).getByLabelText('Descreva o defeito (obrigatório)'), { target: { value: 'Rasgou' } });
    expect(submit).toBeEnabled();
  });

  it('bloqueia tamanho ou cor depois de 30 dias e avisa produto sem outra variação', () => {
    const { modal } = mount(order({ size_or_color_deadline: '2026-10-25T02:59:59Z' }));
    expect(within(modal).getByRole('radio', { name: /Tamanho ou cor/ })).toBeDisabled();
    expect(within(modal).getByText('prazo encerrado')).toBeInTheDocument();
    expect(within(modal).getByRole('radio', { name: /Defeito/ })).toBeEnabled();

    fireEvent.click(within(modal).getByLabelText('Boné'));
    expect(within(modal).getByText('Este produto não tem outra variação.')).toBeInTheDocument();
  });

  it('mostra o erro do backend e permite tentar de novo', async () => {
    requestExchange.mockRejectedValueOnce({
      response: { data: { message: 'A variação escolhida para a troca não tem estoque suficiente.' } },
    });
    const { modal, onRequested } = mount();
    fireEvent.click(within(modal).getByRole('radio', { name: /Tamanho ou cor/ }));
    fireEvent.click(within(modal).getByLabelText('Jaqueta'));
    fireEvent.change(within(modal).getAllByRole('combobox')[1], { target: { value: 'g' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Solicitar troca' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('não tem estoque suficiente');
    expect(onRequested).not.toHaveBeenCalled();
    expect(within(modal).getByRole('button', { name: 'Solicitar troca' })).toBeEnabled();
  });

  it('fecha com Esc e com Cancelar', () => {
    const { modal, onClose } = mount();
    fireEvent.keyDown(modal, { key: 'Escape' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
