import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import OrderEmailModal from './OrderEmailModal';

vi.mock('../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

const order = {
  id: 'abcdef12-0000-0000-0000-000000000000',
  status: 'AWAITING_PAYMENT',
};

const BASE_INFO = {
  block_reason: null,
  unsubscribed: false,
  recipient: { name: 'Ana Cliente', email: 'ana@example.com' },
  order_status: 'AWAITING_PAYMENT',
  suggested_message: 'Seu pagamento ainda está pendente.',
  history: [],
};

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

function setupFetch({ info, send, test } = {}) {
  const calls = [];
  globalThis.fetch = vi.fn((url, opts = {}) => {
    calls.push({ url, opts });
    if (url.endsWith('/email/preview/')) {
      const body = opts.body ? JSON.parse(opts.body) : {};
      return json({ html: `<p>${body.message || ''}</p>` });
    }
    if (url.endsWith('/email/test/')) return test ? test() : json({ sent: true });
    if (url.endsWith('/email/send/')) {
      return send
        ? send()
        : json(
            {
              id: 's1',
              sent_at: '2026-11-13T15:00:00Z',
              sent_by_name: 'Admin Pedidos',
              recipient_email: 'ana@example.com',
            },
            201,
          );
    }
    return json(info || BASE_INFO);
  });
  return calls;
}

describe('OrderEmailModal', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api');
    window.confirm = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('carrega destinatário, preenche sugestão e renderiza pré-visualização', async () => {
    const calls = setupFetch();
    const { container } = render(<OrderEmailModal order={order} onClose={() => {}} />);

    expect(await screen.findByText('Ana Cliente')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();

    const textarea = screen.getByLabelText('Mensagem');
    expect(textarea).toHaveValue('Seu pagamento ainda está pendente.');
    expect(textarea).toHaveAttribute('maxLength', '500');

    await waitFor(() => {
      const frame = screen.getByTitle('Pré-visualização do e-mail');
      expect(frame.getAttribute('srcdoc')).toBe('<p>Seu pagamento ainda está pendente.</p>');
    });

    fireEvent.change(textarea, { target: { value: 'Nova mensagem editada' } });
    await waitFor(() => {
      const previewCall = calls.find(
        (x) => x.url.endsWith('/email/preview/') && x.opts.body.includes('Nova mensagem editada'),
      );
      expect(previewCall).toBeTruthy();
    });

    expect(await axe(container, { iframes: false })).toHaveNoViolations();
  });

  it('limita a mensagem em 500 caracteres', async () => {
    setupFetch();
    render(<OrderEmailModal order={order} onClose={() => {}} />);
    await screen.findByText('Ana Cliente');
    const textarea = screen.getByLabelText('Mensagem');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(550) } });
    expect(screen.getByText('500/500 caracteres')).toBeInTheDocument();
  });

  it('envia teste para o admin', async () => {
    const calls = setupFetch();
    render(<OrderEmailModal order={order} onClose={() => {}} />);
    await screen.findByText('Ana Cliente');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar teste para mim' }));
    await screen.findByText('Teste enviado para o seu e-mail.');

    const call = calls.find((x) => x.url.endsWith('/email/test/'));
    expect(call.opts.method).toBe('POST');
    expect(call.opts.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(call.opts.body)).toEqual({ message: 'Seu pagamento ainda está pendente.' });
  });

  it('confirma antes de enviar, chama onSent e move o foco para o resultado', async () => {
    const calls = setupFetch();
    const onSent = vi.fn();
    render(<OrderEmailModal order={order} onClose={() => {}} onSent={onSent} />);
    await screen.findByText('Ana Cliente');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar e-mail' }));
    expect(screen.getByText('Enviar e-mail para ana@example.com?')).toBeInTheDocument();
    expect(calls.some((x) => x.url.endsWith('/email/send/'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    const statusBanner = await screen.findByText(/E-mail enviado em 13\/11\/2026 para ana@example\.com\./);
    expect(statusBanner).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(statusBanner));
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('mostra histórico e pede confirmação ao reenviar', async () => {
    setupFetch({
      info: {
        ...BASE_INFO,
        history: [
          {
            id: 'h1',
            sent_at: '2026-11-10T15:30:00Z',
            sent_by_name: 'Ana Admin',
            message: 'Oi',
          },
        ],
      },
    });
    render(<OrderEmailModal order={order} onClose={() => {}} />);

    expect(await screen.findByText('E-mail enviado em 10/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/Ana Admin/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail' }));
    expect(
      screen.getByText(/Um e-mail já foi enviado em 10\/11\/2026\. Deseja enviar novamente para ana@example\.com\?/),
    ).toBeInTheDocument();
  });

  it('mostra bloqueio e desabilita o envio quando cliente descadastrado ou status bloqueado', async () => {
    setupFetch({
      info: {
        ...BASE_INFO,
        unsubscribed: true,
        block_reason: 'O cliente pediu para não receber e-mails.',
      },
    });
    render(<OrderEmailModal order={order} onClose={() => {}} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('O cliente pediu para não receber e-mails.');
    expect(screen.getByRole('button', { name: 'Enviar e-mail' })).toBeDisabled();
  });

  it('não fecha enquanto envia e move foco para o erro em caso de falha', async () => {
    let resolveSend;
    setupFetch({
      send: () =>
        new Promise((r) => {
          resolveSend = () => r({ ok: false, status: 502, json: () => Promise.resolve({ error: 'Falha SMTP.' }) });
        }),
    });
    const onClose = vi.fn();
    render(<OrderEmailModal order={order} onClose={onClose} />);
    await screen.findByText('Ana Cliente');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar e-mail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveSend();
    });
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Falha SMTP.'));
  });
});
