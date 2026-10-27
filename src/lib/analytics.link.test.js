import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANONYMOUS_ID_KEY, CONSENT_GRANTED, linkAnonymousEvents, setAnalyticsConsent } from './analytics';

describe('linkAnonymousEvents', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não vincula sem consentimento', () => {
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');
    localStorage.setItem('accessToken', 'token-teste');

    linkAnonymousEvents();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não vincula sem identificador anônimo', () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    localStorage.setItem('accessToken', 'token-teste');

    linkAnonymousEvents();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não vincula sem token de login', () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');

    linkAnonymousEvents();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia o identificador anônimo com o token quando há consentimento e login', () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');
    localStorage.setItem('accessToken', 'token-teste');

    linkAnonymousEvents();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/link\/$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer token-teste');
    expect(JSON.parse(options.body)).toEqual({ anonymous_id: 'navegador-1' });
  });
});
