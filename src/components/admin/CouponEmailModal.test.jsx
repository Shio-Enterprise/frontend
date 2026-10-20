import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CouponEmailModal from './CouponEmailModal';

vi.mock('../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

const AUDIENCE = { total: 87, buyers: 62, subscribers: 40, overlap: 15, suppressed: 3 };
const coupon = { id: 7, code: 'VERAO20' };

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

function setupFetch({ info, send, test } = {}) {
  const calls = [];
  globalThis.fetch = vi.fn((url, opts = {}) => {
    calls.push({ url, opts });
    if (url.endsWith('/email/preview/')) return json({ html: '<p>oi</p>' });
    if (url.endsWith('/email/test/')) return test ? test() : json({ sent: true });
    if (url.endsWith('/email/send/')) {
      return send ? send() : json({ sent_count: 87, failed_count: 0, sent_at: '2026-10-20T10:00:00Z' }, 201);
    }
    return json(info || { block_reason: null, audience: AUDIENCE, history: [] });
  });
  return calls;
}

describe('CouponEmailModal', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api');
    window.confirm = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('mostra total e quebra do público', async () => {
    setupFetch();
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    expect(await screen.findByText('87 pessoas')).toBeInTheDocument();
    expect(screen.getByText('62 clientes que já compraram')).toBeInTheDocument();
    expect(screen.getByText('40 inscritos na newsletter / cadastro')).toBeInTheDocument();
    expect(screen.getByText('15 aparecem nos dois (recebem 1 e-mail)')).toBeInTheDocument();
    expect(screen.getByText('3 pediram para não receber')).toBeInTheDocument();
  });

  it('mensagem atualiza a pré-visualização', async () => {
    const calls = setupFetch();
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Olá' } });
    await waitFor(() => {
      const c = calls.find((x) => x.url.endsWith('/email/preview/') && x.opts.body.includes('Olá'));
      expect(c).toBeTruthy();
    });
    const frame = await waitFor(() => {
      const f = screen.getByTitle('Pré-visualização do e-mail');
      expect(f.getAttribute('srcdoc')).toBe('<p>oi</p>');
      return f;
    });
    expect(frame.tagName).toBe('IFRAME');
  });

  it('envia teste para o admin', async () => {
    const calls = setupFetch();
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Olá' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar teste para mim' }));
    await screen.findByText(/Teste enviado/);
    const c = calls.find((x) => x.url.endsWith('/email/test/'));
    expect(c.opts.method).toBe('POST');
    expect(c.opts.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(c.opts.body)).toEqual({ message: 'Olá' });
  });

  it('confirma antes de enviar e mostra resultado', async () => {
    const calls = setupFetch();
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 pessoas' }));
    expect(screen.getByText('Enviar para 87 pessoas? Não dá para desfazer.')).toBeInTheDocument();
    expect(calls.some((x) => x.url.endsWith('/email/send/'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('87 enviados, 0 falhas')).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('avisa reenvio quando já há histórico', async () => {
    setupFetch({
      info: {
        block_reason: null,
        audience: AUDIENCE,
        history: [{ sent_at: '2026-10-05T15:30:00Z', sent_by_name: 'Ana', sent_count: 50, failed_count: 1 }],
      },
    });
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    expect(screen.getByText(/Ana · 50 enviados · 1 falhas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 pessoas' }));
    expect(screen.getByText(/Este cupom já foi enviado em \d{2}\/\d{2} para 50 pessoas\. Enviar de novo\?/)).toBeInTheDocument();
  });

  it('desabilita envio enquanto envia', async () => {
    let resolveSend;
    const calls = setupFetch({
      send: () => new Promise((r) => { resolveSend = () => r({ ok: true, status: 201, json: () => Promise.resolve({ sent_count: 87, failed_count: 0 }) }); }),
    });
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 pessoas' }));
    const confirmBtn = screen.getByRole('button', { name: 'Confirmar envio' });
    fireEvent.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(calls.filter((x) => x.url.endsWith('/email/send/'))).toHaveLength(1);
    await act(async () => { resolveSend(); });
    expect(await screen.findByText('87 enviados, 0 falhas')).toBeInTheDocument();
  });

  it('bloqueia com motivo e sem público', async () => {
    setupFetch({ info: { block_reason: 'Cupom inativo.', audience: { ...AUDIENCE, total: 0 }, history: [] } });
    const { unmount } = render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    expect(await screen.findByText('Cupom inativo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar para/ })).toBeDisabled();
    unmount();
    setupFetch({ info: { block_reason: null, audience: { ...AUDIENCE, total: 0 }, history: [] } });
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    expect(await screen.findByText(/Ninguém para receber/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar para/ })).toBeDisabled();
  });

  it('mostra erro do backend ao enviar', async () => {
    setupFetch({ send: () => json({ error: 'Cupom inativo.' }, 400) });
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 pessoas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('Cupom inativo.')).toBeInTheDocument();
  });

  it('contador 0/500 e limita a 500', async () => {
    setupFetch();
    render(<CouponEmailModal coupon={coupon} onClose={() => {}} />);
    await screen.findByText('87 pessoas');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    const ta = screen.getByLabelText(/Mensagem/);
    expect(ta).toHaveAttribute('maxLength', '500');
    fireEvent.change(ta, { target: { value: 'a'.repeat(520) } });
    expect(screen.getByText('500/500')).toBeInTheDocument();
  });

  it('Esc fecha', async () => {
    setupFetch();
    const onClose = vi.fn();
    render(<CouponEmailModal coupon={coupon} onClose={onClose} />);
    await screen.findByText('87 pessoas');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
