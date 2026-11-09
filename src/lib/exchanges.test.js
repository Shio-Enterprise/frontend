import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './axios';
import {
  approveExchange,
  cancelExchange,
  completeExchange,
  exchangeTimelineEvents,
  hasCustomerExchangePanel,
  openExchange,
  receiveExchange,
  rejectExchange,
  requestExchange,
  variationLabel,
} from './exchanges';

vi.mock('./axios', () => ({
  default: { post: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

const exchange = (overrides = {}) => ({
  id: 'abcdef12-3456',
  status: 'REQUESTED',
  review_message: '',
  tracking_code: '',
  created_at: '2026-10-20T10:00:00Z',
  reviewed_at: null,
  received_at: null,
  completed_at: null,
  canceled_at: null,
  ...overrides,
});

describe('exchanges', () => {
  it('mostra o painel com troca, com troca possível ou com prazo a explicar', () => {
    expect(hasCustomerExchangePanel({ exchanges: [exchange()] })).toBe(true);
    expect(hasCustomerExchangePanel({ exchange_eligibility: { can_request: true } })).toBe(true);
    expect(hasCustomerExchangePanel({ exchange_eligibility: { code: 'deadline_passed' } })).toBe(true);
    expect(hasCustomerExchangePanel({ exchange_eligibility: { code: 'delivery_date_unknown' } })).toBe(true);
    for (const code of ['order_not_delivered', 'payment_not_confirmed', 'refund_exists']) {
      expect(hasCustomerExchangePanel({ exchanges: [], exchange_eligibility: { code } })).toBe(false);
    }
  });

  it('acha a troca aberta e formata a variação', () => {
    const open = exchange({ id: 'b', status: 'APPROVED' });
    expect(openExchange({ exchanges: [exchange({ id: 'a', status: 'COMPLETED' }), open] })).toBe(open);
    expect(openExchange({ exchanges: [exchange({ status: 'CANCELED' })] })).toBeNull();
    expect(openExchange({})).toBeNull();
    expect(variationLabel({ size: 'G', color: 'Preto' })).toBe('G / Preto');
    expect(variationLabel({ size: 'G', color: '' })).toBe('G');
    expect(variationLabel(null)).toBe('—');
  });

  it('gera os eventos da linha do tempo de cada etapa', () => {
    const events = exchangeTimelineEvents([
      exchange({
        status: 'COMPLETED',
        reviewed_at: '2026-10-21T10:00:00Z',
        received_at: '2026-10-25T10:00:00Z',
        completed_at: '2026-10-26T10:00:00Z',
        tracking_code: 'BR1',
      }),
      exchange({ id: 'rej', status: 'REJECTED', reviewed_at: '2026-10-21T10:00:00Z', review_message: 'Usada' }),
      exchange({ id: 'can', status: 'CANCELED', canceled_at: '2026-10-22T10:00:00Z', review_message: 'Acabou' }),
    ]);
    expect(events.map((event) => event.label)).toEqual([
      'Troca solicitada', 'Troca aprovada', 'Peça da troca recebida', 'Nova peça enviada',
      'Troca solicitada', 'Troca recusada',
      'Troca solicitada', 'Troca cancelada',
    ]);
    expect(events[3].tracking_code).toBe('BR1');
    expect(events[5].comment).toBe('Usada');
    expect(events[7].comment).toBe('Acabou');
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(exchangeTimelineEvents()).toEqual([]);
  });

  it('chama as rotas do cliente e do admin', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'o1' } });
    const payload = { reason: 'DEFECT', comment: 'Rasgou', items: [{ order_item_id: 'i1' }] };
    await expect(requestExchange('o1', payload)).resolves.toEqual({ id: 'o1' });
    expect(apiClient.post).toHaveBeenCalledWith('/orders/my-orders/o1/exchange-request/', payload);

    const actions = [
      [approveExchange, 'approve'],
      [rejectExchange, 'reject'],
      [receiveExchange, 'receive'],
      [completeExchange, 'complete'],
      [cancelExchange, 'cancel'],
    ];
    for (const [action, path] of actions) {
      await action('o1', { message: 'x' });
      expect(apiClient.post).toHaveBeenLastCalledWith(`/orders/admin/o1/exchange/${path}/`, { message: 'x' });
    }
  });
});
