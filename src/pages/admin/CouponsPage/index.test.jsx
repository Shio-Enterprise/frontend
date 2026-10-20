import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CouponsPage from './index';

const state = vi.hoisted(() => ({ coupons: null }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url) => ({
    data: url.includes('admin/coupons') ? state.coupons : null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));
vi.mock('../../../components/admin/CouponEmailModal', () => ({
  default: ({ coupon }) => <div>modal-email {coupon.code}</div>,
}));

const base = { id: 1, code: 'VERAO20', is_active: true, discount_type: 'PERCENTAGE', discount_value: '10', uses_count: 0, max_uses_total: null, expiration_date: null };

function renderPage() {
  render(<MemoryRouter><CouponsPage /></MemoryRouter>);
}

describe('CouponsPage', () => {
  beforeEach(() => {
    state.coupons = [];
    vi.stubEnv('VITE_API_URL', 'http://api');
  });

  it('renders headline', () => {
    renderPage();
    expect(screen.getByText(/Cupons de Desconto/i)).toBeInTheDocument();
  });

  async function saveForm(coupons = []) {
    state.coupons = coupons;
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ...base, id: 9, code: 'NOVO' }) }));
    renderPage();
  }

  it('após criar cupom pergunta se quer enviar', async () => {
    await saveForm();
    fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
    fireEvent.change(screen.getByPlaceholderText('Ex: VERAO20'), { target: { value: 'novo' } });
    fireEvent.change(document.querySelector('input[type=number][step="0.01"]'), { target: { value: '10' } });
    fireEvent.submit(document.getElementById('coupon-form'));
    expect(await screen.findByText('Cupom NOVO criado. Quer enviar este cupom por e-mail para os clientes agora?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar por e-mail' }));
    expect(screen.getByText('modal-email NOVO')).toBeInTheDocument();
  });

  it('editar cupom não pergunta', async () => {
    await saveForm([base]);
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Cupom' }));
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(document.getElementById('coupon-form')).toBeNull());
    expect(screen.queryByText(/Quer enviar este cupom/)).not.toBeInTheDocument();
  });

  it('menu Ações tem Enviar por e-mail desabilitado para cupom inativo', () => {
    state.coupons = [{ ...base, is_active: false }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    expect(screen.getByRole('button', { name: 'Enviar por e-mail' })).toBeDisabled();
  });

  it('desabilita para cupom esgotado ou vencido e habilita para válido', () => {
    state.coupons = [{ ...base, max_uses_total: 5, uses_count: 5 }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    expect(screen.getByRole('button', { name: 'Enviar por e-mail' })).toBeDisabled();
  });

  it('habilita para cupom válido e abre o modal', () => {
    state.coupons = [base];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar por e-mail' }));
    expect(screen.getByText('modal-email VERAO20')).toBeInTheDocument();
  });

  it('selo mostra Vencido, Esgotado, Inativo ou Ativo', () => {
    state.coupons = [
      { ...base, id: 1, code: 'VALIDO' },
      { ...base, id: 2, code: 'VENCIDO', expiration_date: '2020-01-01T00:00:00Z' },
      { ...base, id: 3, code: 'ESGOTADO', max_uses_total: 5, uses_count: 5, remaining_uses: 0 },
      { ...base, id: 4, code: 'DESLIGADO', is_active: false, expiration_date: '2020-01-01T00:00:00Z' },
    ];
    renderPage();
    const badgeOf = (code) => screen.getByText(code).closest('tr').querySelector('[data-testid="coupon-status"]').textContent;
    expect(badgeOf('VALIDO')).toBe('Ativo');
    expect(badgeOf('VENCIDO')).toBe('Vencido');
    expect(badgeOf('ESGOTADO')).toBe('Esgotado');
    expect(badgeOf('DESLIGADO')).toBe('Inativo');
  });

  it('vencido e esgotado ao mesmo tempo mostra Vencido', () => {
    state.coupons = [{ ...base, expiration_date: '2020-01-01T00:00:00Z', max_uses_total: 1, uses_count: 1 }];
    renderPage();
    expect(screen.getByTestId('coupon-status').textContent).toBe('Vencido');
  });

  function openEdit(coupon) {
    state.coupons = [coupon];
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(coupon) }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Cupom' }));
  }

  const sentBody = () => JSON.parse(globalThis.fetch.mock.calls.at(-1)[1].body);

  it('apagar limites ao editar envia null e volta a ser ilimitado', async () => {
    openEdit({ ...base, max_uses_total: 10, max_uses_per_user: 2, min_order_value: '50.00', max_discount_amount: '30.00' });
    fireEvent.change(screen.getByPlaceholderText('Ilimitado'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Normal: 1'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Aplicado ao subtotal'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Valor máximo descontado'), { target: { value: '' } });
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody()).toMatchObject({ max_uses_total: null, max_uses_per_user: null, min_order_value: null, max_discount_amount: null });
  });

  it('apagar datas ao editar envia null', async () => {
    openEdit({ ...base, starts_at: '2030-01-01T10:00:00Z', expiration_date: '2030-02-01T10:00:00Z' });
    document.querySelectorAll('input[type="datetime-local"]').forEach((el) => fireEvent.change(el, { target: { value: '' } }));
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody()).toMatchObject({ starts_at: null, expiration_date: null });
  });

  it('manter limite preenchido envia o número', async () => {
    openEdit({ ...base, max_uses_total: 10 });
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody().max_uses_total).toBe(10);
  });

  it('editar cupom antigo com limite 0 mostra 0 no campo', () => {
    openEdit({ ...base, max_uses_total: 0 });
    expect(screen.getByPlaceholderText('Ilimitado')).toHaveValue(0);
  });

  it('campos de limite exigem no mínimo 1', () => {
    openEdit(base);
    expect(screen.getByPlaceholderText('Ilimitado')).toHaveAttribute('min', '1');
    expect(screen.getByPlaceholderText('Normal: 1')).toHaveAttribute('min', '1');
  });

  it('erro de validação do backend aparece legível', async () => {
    openEdit(base);
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ max_uses_total: ['Certifique-se que este valor seja maior ou igual a 1.'] }),
    }));
    fireEvent.submit(document.getElementById('coupon-form'));
    expect(await screen.findByText('Usos Totais: Certifique-se que este valor seja maior ou igual a 1.')).toBeInTheDocument();
    expect(screen.queryByText(/\{"max_uses_total"/)).not.toBeInTheDocument();
  });

  it('limite de usos 0 não aparece como Ilimitado', () => {
    state.coupons = [{ ...base, max_uses_total: 0, uses_count: 0, remaining_uses: 0 }];
    renderPage();
    expect(screen.getByText('0 restantes')).toBeInTheDocument();
    expect(screen.queryByText('Ilimitado')).not.toBeInTheDocument();
  });
});
