import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewsletterModal from './NewsletterModal';

vi.mock('../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

// Resposta do backend: o envio começou e segue em segundo plano
const STARTED = {
  id: 'send-1',
  status: 'sending',
  total_count: 87,
  sent_count: 0,
  failed_count: 0,
  sent_at: '2026-10-20T10:00:00Z',
};

function setupFetch({ info, send, test, preview } = {}) {
  const calls = [];
  globalThis.fetch = vi.fn((url, opts = {}) => {
    calls.push({ url, opts });
    if (url.endsWith('/newsletter/preview/')) {
      return preview ? preview() : json({ html: '<p>Prévia Newsletter</p>' });
    }
    if (url.endsWith('/newsletter/test/')) {
      return test ? test() : json({ sent: true });
    }
    if (url.endsWith('/newsletter/send/')) {
      return send
        ? send()
        : json(STARTED, 202);
    }
    return json(info || { total_subscribers: 87, history: [] });
  });
  return calls;
}

describe('NewsletterModal', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api');
    window.confirm = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('mostra total de inscritos elegíveis', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    expect(await screen.findByText('87 inscritos')).toBeInTheDocument();
    expect(
      screen.getByText(/Apenas inscritos que aceitaram receber a newsletter e não cancelaram/),
    ).toBeInTheDocument();
  });

  it('assunto e mensagem atualizam a pré-visualização', async () => {
    const calls = setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Drop Outono' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Novos produtos' } });

    await waitFor(() => {
      const c = calls.find(
        (x) =>
          x.url.endsWith('/newsletter/preview/') &&
          x.opts.body.includes('Drop Outono') &&
          x.opts.body.includes('Novos produtos'),
      );
      expect(c).toBeTruthy();
    });

    const frame = await waitFor(() => {
      const f = screen.getByTitle('Pré-visualização da newsletter');
      expect(f.getAttribute('srcdoc')).toBe('<p>Prévia Newsletter</p>');
      return f;
    });
    expect(frame.tagName).toBe('IFRAME');
  });

  it('envia teste para o próprio admin', async () => {
    const calls = setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Assunto Teste' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Corpo do teste' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar teste para mim' }));
    expect(await screen.findByText(/Teste enviado para o seu e-mail com sucesso/)).toBeInTheDocument();

    const c = calls.find((x) => x.url.endsWith('/newsletter/test/'));
    expect(c.opts.method).toBe('POST');
    expect(c.opts.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(c.opts.body)).toEqual({
      subject: 'Assunto Teste',
      message: 'Corpo do teste',
    });
  });

  it('alerta se tentar enviar teste com assunto ou mensagem em branco', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    // Botão desabilitado quando vazio
    expect(screen.getByRole('button', { name: 'Enviar teste para mim' })).toBeDisabled();
  });

  it('confirma antes de enviar e mostra resultado', async () => {
    const calls = setupFetch();
    const onSent = vi.fn();
    render(<NewsletterModal onClose={() => {}} onSent={onSent} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Assunto Real' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Mensagem Real' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 inscritos' }));
    expect(screen.getByText('Enviar para 87 inscritos? Não dá para desfazer.')).toBeInTheDocument();
    expect(calls.some((x) => x.url.endsWith('/newsletter/send/'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('Envio iniciado!')).toBeInTheDocument();
    expect(screen.getByText(/sendo enviada para 87 inscritos em\s+segundo plano/)).toBeInTheDocument();
    expect(onSent).toHaveBeenCalledWith(expect.objectContaining({ status: 'sending' }));
  });

  it('desabilita botão de envio se não houver público', async () => {
    setupFetch({ info: { total_subscribers: 0, history: [] } });
    render(<NewsletterModal onClose={() => {}} />);
    expect(await screen.findByText(/Nenhum inscrito elegível/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar para 0 inscritos' })).toBeDisabled();
  });

  it('mostra erro retornado pelo backend ao enviar', async () => {
    setupFetch({ send: () => json({ error: 'Erro no servidor de e-mail.' }, 500) });
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Assunto' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Mensagem' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 inscritos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('Erro no servidor de e-mail.')).toBeInTheDocument();
  });

  it('mostra o 409 quando já há outro envio em andamento', async () => {
    setupFetch({
      send: () => json({ error: 'Já existe um envio de newsletter em andamento.' }, 409),
    });
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Assunto' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Mensagem' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 inscritos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(
      await screen.findByText('Já existe um envio de newsletter em andamento.'),
    ).toBeInTheDocument();
  });

  it('aceita mensagem até o limite do backend (10000 caracteres)', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');
    const textarea = screen.getByLabelText(/Mensagem/);
    expect(textarea).toHaveAttribute('maxLength', '10000');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(10001) } });
    expect(textarea.value).toHaveLength(10000);
    expect(screen.getByText('10000/10000 caracteres')).toBeInTheDocument();
  });

  it('trata singular corretamente para 1 inscrito', async () => {
    setupFetch({
      info: { total_subscribers: 1, history: [] },
      send: () => json({ ...STARTED, total_count: 1 }, 202),
    });
    render(<NewsletterModal onClose={() => {}} />);
    expect(await screen.findByText('1 inscrito')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'Aviso' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'Texto' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 1 inscrito' }));
    expect(screen.getByText('Enviar para 1 inscrito? Não dá para desfazer.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText(/sendo enviada para 1 inscrito em/)).toBeInTheDocument();
  });

  it('não fecha por Esc enquanto envia', async () => {
    let resolveSend;
    setupFetch({
      send: () =>
        new Promise((r) => {
          resolveSend = () =>
            r({ ok: true, status: 202, json: () => Promise.resolve(STARTED) });
        }),
    });
    const onClose = vi.fn();
    render(<NewsletterModal onClose={onClose} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'M' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 inscritos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveSend();
    });
    expect(await screen.findByText('Envio iniciado!')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ao pedir confirmação o foco vai para a caixa; Voltar devolve ao botão de envio (#64)', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'M' } });

    const sendButton = screen.getByRole('button', { name: 'Enviar para 87 inscritos' });
    sendButton.focus();
    fireEvent.click(sendButton);

    const box = screen.getByRole('group', { name: 'Enviar para 87 inscritos? Não dá para desfazer.' });
    expect(box).toHaveAccessibleDescription(/e-mail individual/);
    await waitFor(() => expect(document.activeElement).toBe(box));
    // Não cai direto no botão que dispara o envio
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Confirmar envio' }));

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Enviar para 87 inscritos' })),
    );
  });

  it('após enviar, o foco vai para o resultado (#64)', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    await screen.findByText('87 inscritos');

    fireEvent.change(screen.getByLabelText(/Assunto/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Mensagem/), { target: { value: 'M' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para 87 inscritos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    await screen.findByText('Envio iniciado!');
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Envio iniciado!'));
  });

  it('explica o marcador {nome} junto do campo de mensagem (#99)', async () => {
    setupFetch();
    render(<NewsletterModal onClose={() => {}} />);
    const campo = await screen.findByLabelText('Mensagem');
    const dica = screen.getByText(/\{nome\}/);
    expect(dica).toHaveTextContent(
      'Para chamar a pessoa pelo nome, escreva {nome}. Ex.: "Olá, {nome}!". Quem não tem nome cadastrado recebe "Olá!".',
    );
    expect(campo.getAttribute('aria-describedby').split(' ')).toContain(dica.id);
  });
});
