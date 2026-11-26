import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsentBanner from './ConsentBanner';
import {
  ANONYMOUS_ID_KEY,
  CONSENT_KEY,
  CONSENT_VERSION_KEY,
  getAnonymousId,
  setAnalyticsConsent,
} from '../../lib/analytics';


const callsTo = (fetchMock, pattern) =>
  fetchMock.mock.calls.filter(([url]) => pattern.test(url));

const renderBanner = (path = '/produtos') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ConsentBanner />
    </MemoryRouter>,
  );

describe('ConsentBanner', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('aparece quando o visitante ainda não respondeu', () => {
    renderBanner();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('não aparece quando a escolha já foi feita', () => {
    setAnalyticsConsent('denied');

    renderBanner();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ao aceitar, grava o consentimento, some e registra a página atual', async () => {
    renderBanner('/produtos');

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));

    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [eventCall] = callsTo(fetchMock, /\/api\/analytics\/events\/$/);
    expect(JSON.parse(eventCall[1].body)).toMatchObject({
      event_type: 'PAGE_VIEW',
      path: '/produtos',
    });
  });

  it('ao aceitar, registra a escolha no backend antes de enviar a página atual', async () => {
    renderBanner('/produtos');

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [consentUrl, consentOptions] = fetchMock.mock.calls[0];
    expect(consentUrl).toMatch(/\/api\/analytics\/consent\/$/);
    expect(consentOptions.method).toBe('POST');
    expect(JSON.parse(consentOptions.body)).toEqual({
      choice: 'granted',
      anonymous_id: localStorage.getItem(ANONYMOUS_ID_KEY),
    });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/analytics\/events\/$/);
  });

  it('ao aceitar, registra a página atual mesmo se o registro da escolha falhar', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('rede indisponível')));
    renderBanner('/produtos');

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));

    await waitFor(() =>
      expect(callsTo(fetchMock, /\/api\/analytics\/events\/$/)).toHaveLength(1),
    );
  });

  it('ao recusar, grava a recusa, some, registra no backend e não envia evento', async () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/consent\/$/);
    expect(JSON.parse(options.body).choice).toBe('denied');
    expect(JSON.parse(options.body).anonymous_id).toBeTruthy();
    expect(callsTo(fetchMock, /\/api\/analytics\/events\/$/)).toHaveLength(0);
  });

  it('ao recusar com identificador anônimo, registra a recusa no backend e não envia evento', async () => {
    const anonymousId = getAnonymousId();
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/consent\/$/);
    expect(JSON.parse(options.body)).toEqual({ choice: 'denied', anonymous_id: anonymousId });
    expect(callsTo(fetchMock, /\/api\/analytics\/events\/$/)).toHaveLength(0);
  });

  it('reaparece quando a versão local do texto do banner está desatualizada', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    localStorage.setItem(CONSENT_VERSION_KEY, '0');

    renderBanner();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('reaparece quando a escolha local é apagada', () => {
    setAnalyticsConsent('granted');
    renderBanner();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => setAnalyticsConsent(null));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('some quando a escolha é definida fora do banner', () => {
    renderBanner();

    act(() => setAnalyticsConsent('denied'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ao recusar, apaga o identificador anônimo já guardado', () => {
    getAnonymousId();
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).not.toBeNull();
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBeNull();
  });
});
