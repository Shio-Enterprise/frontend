import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewsletterPage from './index';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

const SAMPLE_DATA = {
  total_subscribers: 132,
  history: [
    {
      id: 'abc-123',
      subject: 'Drop Cyberpunk Inverno',
      message: 'Olá, confira as novas jaquetas e moletons da coleção.',
      sent_at: '2026-11-05T14:30:00Z',
      sent_by_name: 'Admin Teste',
      sent_count: 130,
      failed_count: 2,
    },
  ],
};

describe('NewsletterPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exibe métricas e histórico de campanhas', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => json(SAMPLE_DATA));

    render(<NewsletterPage />);

    expect(await screen.findByText('Drop Cyberpunk Inverno')).toBeInTheDocument();
    expect(screen.getByTestId('metric-subscribers')).toHaveTextContent('132');
    expect(screen.getByTestId('metric-campaigns')).toHaveTextContent('1');
    expect(screen.getByText('Admin Teste')).toBeInTheDocument();
    expect(screen.getByText('130 enviados')).toBeInTheDocument();
    expect(screen.getByText('2 falhas')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há campanhas enviadas', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      json({ total_subscribers: 50, history: [] }),
    );

    render(<NewsletterPage />);

    expect(await screen.findByText('Nenhuma newsletter enviada ainda.')).toBeInTheDocument();
    expect(screen.getByTestId('metric-subscribers')).toHaveTextContent('50');
    expect(screen.getByTestId('metric-campaigns')).toHaveTextContent('0');
  });

  it('abre o modal ao clicar em + Nova Newsletter', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => json(SAMPLE_DATA));

    render(<NewsletterPage />);

    await screen.findByText('Drop Cyberpunk Inverno');
    fireEvent.click(screen.getByRole('button', { name: '+ Nova Newsletter' }));

    expect(await screen.findByRole('heading', { name: 'Enviar Newsletter' })).toBeInTheDocument();
  });

  it('abre gaveta de detalhes ao clicar em Ver mensagem', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => json(SAMPLE_DATA));

    render(<NewsletterPage />);

    await screen.findByText('Drop Cyberpunk Inverno');
    fireEvent.click(screen.getByRole('button', { name: 'Ver mensagem' }));

    expect(await screen.findByText('Detalhes da Newsletter')).toBeInTheDocument();
    expect(
      screen.getByText('Olá, confira as novas jaquetas e moletons da coleção.'),
    ).toBeInTheDocument();

    // Fecha gaveta
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => {
      expect(screen.queryByText('Detalhes da Newsletter')).not.toBeInTheDocument();
    });
  });

  it('exibe erro e permite tentar novamente', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return json({ detail: 'Falha no servidor.' }, 500);
      }
      return json(SAMPLE_DATA);
    });

    render(<NewsletterPage />);

    expect(await screen.findByText('Falha no servidor.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Drop Cyberpunk Inverno')).toBeInTheDocument();
  });
});
