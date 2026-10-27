import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANONYMOUS_ID_KEY,
  CONSENT_DENIED,
  CONSENT_GRANTED,
  CONSENT_KEY,
  EVENT_TYPES,
  getAnonymousId,
  setAnalyticsConsent,
  trackEvent,
} from './analytics';

const lastBody = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body);

describe('analytics', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não envia nenhum evento sem consentimento', () => {
    trackEvent(EVENT_TYPES.PAGE_VIEW, { path: '/' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não envia nenhum evento quando o consentimento foi recusado', () => {
    setAnalyticsConsent(CONSENT_DENIED);

    trackEvent(EVENT_TYPES.PAGE_VIEW, { path: '/' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia o evento com o identificador anônimo quando há consentimento', () => {
    setAnalyticsConsent(CONSENT_GRANTED);

    trackEvent(EVENT_TYPES.PAGE_VIEW, { path: '/produtos' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/events\/$/);
    expect(options.method).toBe('POST');
    expect(lastBody(fetchMock)).toEqual({
      event_type: 'PAGE_VIEW',
      anonymous_id: localStorage.getItem(ANONYMOUS_ID_KEY),
      path: '/produtos',
    });
  });

  it('inclui produto e variação quando informados', () => {
    setAnalyticsConsent(CONSENT_GRANTED);

    trackEvent(EVENT_TYPES.ADD_TO_CART, { productId: 'prod-1', variationId: 'var-1' });

    expect(lastBody(fetchMock)).toMatchObject({
      event_type: 'ADD_TO_CART',
      product: 'prod-1',
      variation: 'var-1',
    });
  });

  it('não envia Authorization para visitante sem login', () => {
    setAnalyticsConsent(CONSENT_GRANTED);

    trackEvent(EVENT_TYPES.PAGE_VIEW, { path: '/' });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('mantém o mesmo identificador anônimo entre chamadas', () => {
    const primeiro = getAnonymousId();

    expect(getAnonymousId()).toBe(primeiro);
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBe(primeiro);
  });

  it('não lança erro quando o envio falha', async () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    fetchMock.mockImplementation(() => Promise.reject(new Error('rede indisponível')));

    expect(() => trackEvent(EVENT_TYPES.PAGE_VIEW, { path: '/' })).not.toThrow();
    await Promise.resolve();
  });

  it('grava o consentimento na chave esperada', () => {
    setAnalyticsConsent(CONSENT_GRANTED);

    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
  });
});
