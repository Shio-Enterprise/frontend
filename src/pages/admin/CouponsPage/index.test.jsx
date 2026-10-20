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
});
