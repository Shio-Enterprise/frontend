import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANONYMOUS_ID_KEY,
  CONSENT_DENIED,
  CONSENT_GRANTED,
  CONSENT_KEY,
  CONSENT_VERSION_KEY,
  CURRENT_CONSENT_VERSION,
  registerAnalyticsConsent,
  refreshAnalyticsConsentVersion,
  setAnalyticsConsent,
  syncAnalyticsConsent,
} from './analytics';

const jsonResponse = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

const serverConsent = (choice, { version = '1', currentVersion = '1' } = {}) => ({
  choice,
  version: choice === null ? null : version,
  current_version: currentVersion,
  created_at: choice === null ? null : '2026-11-19T08:00:00+00:00',
});

describe('registerAnalyticsConsent', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('visitante que aceita registra a escolha com o identificador anônimo e a versão', async () => {
    await registerAnalyticsConsent(CONSENT_GRANTED);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/consent\/$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body)).toEqual({
      choice: CONSENT_GRANTED,
      anonymous_id: localStorage.getItem(ANONYMOUS_ID_KEY),
    });
    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
    expect(localStorage.getItem(CONSENT_VERSION_KEY)).toBe(CURRENT_CONSENT_VERSION);
  });

  it('recusa envia o identificador anônimo existente e depois o apaga do navegador', async () => {
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');

    await registerAnalyticsConsent(CONSENT_DENIED);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      choice: CONSENT_DENIED,
      anonymous_id: 'navegador-1',
    });
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBeNull();
    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_DENIED);
  });

  it('visitante sem identificador anônimo que recusa gera um id, registra e depois o apaga', async () => {
    await registerAnalyticsConsent(CONSENT_DENIED);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.choice).toBe(CONSENT_DENIED);
    expect(body.anonymous_id).toBeTruthy();
    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_DENIED);
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBeNull();
  });

  it('usuário logado envia o token junto com o identificador anônimo', async () => {
    localStorage.setItem('accessToken', 'token-teste');

    await registerAnalyticsConsent(CONSENT_DENIED);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-teste');
    const body = JSON.parse(options.body);
    expect(body.choice).toBe(CONSENT_DENIED);
    expect(body.anonymous_id).toBeTruthy();
  });

  it('mantém a escolha local e não rejeita quando o backend falha', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('rede indisponível')));

    await expect(registerAnalyticsConsent(CONSENT_GRANTED)).resolves.toBeUndefined();
    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
  });
});

describe('syncAnalyticsConsent', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'token-teste');
    fetchMock = vi.fn(() => jsonResponse(serverConsent(null)));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não consulta o backend sem login', async () => {
    localStorage.removeItem('accessToken');

    await syncAnalyticsConsent();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('consulta com o token e o identificador anônimo deste navegador', async () => {
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador 1');

    await syncAnalyticsConsent();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/consent\/\?anonymous_id=navegador%201$/);
    expect(options.method).toBeUndefined();
    expect(options.headers.Authorization).toBe('Bearer token-teste');
  });

  it('adota o aceite registrado na conta em um navegador sem escolha', async () => {
    fetchMock.mockImplementation(() => jsonResponse(serverConsent(CONSENT_GRANTED)));

    await syncAnalyticsConsent();

    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
    expect(localStorage.getItem(CONSENT_VERSION_KEY)).toBe('1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('adota a recusa registrada e apaga o identificador anônimo', async () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');
    fetchMock.mockImplementation(() => jsonResponse(serverConsent(CONSENT_DENIED)));

    await syncAnalyticsConsent();

    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_DENIED);
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBeNull();
  });

  it('recusa local prevalece sobre aceite remoto da conta', async () => {
    setAnalyticsConsent(CONSENT_DENIED);
    fetchMock
      .mockImplementationOnce(() => jsonResponse(serverConsent(CONSENT_GRANTED)))
      .mockImplementationOnce(() => Promise.resolve({ ok: true }));

    await syncAnalyticsConsent();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).choice).toBe(CONSENT_DENIED);
    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_DENIED);
  });

  it('apaga a escolha local quando a versão aceita está desatualizada', async () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    fetchMock.mockImplementation(() =>
      jsonResponse(serverConsent(CONSENT_GRANTED, { version: '1', currentVersion: '2' })),
    );

    await syncAnalyticsConsent();

    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('registra no backend a escolha local vigente quando não há registro', async () => {
    setAnalyticsConsent(CONSENT_GRANTED);
    localStorage.setItem(ANONYMOUS_ID_KEY, 'navegador-1');

    await syncAnalyticsConsent();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/analytics\/consent\/$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      choice: CONSENT_GRANTED,
      anonymous_id: 'navegador-1',
    });
  });

  it('não promove aceite local de versão antiga a prova da versão atual', async () => {
    localStorage.setItem(CONSENT_KEY, CONSENT_GRANTED);
    localStorage.setItem(CONSENT_VERSION_KEY, '1');
    fetchMock.mockImplementation(() =>
      jsonResponse(serverConsent(null, { currentVersion: '2' })),
    );

    await syncAnalyticsConsent();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('não registra nada quando não há escolha local nem no backend', async () => {
    await syncAnalyticsConsent();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it.each([
    ['erro HTTP', () => jsonResponse({ detail: 'erro' }, false)],
    ['falha de rede', () => Promise.reject(new Error('rede indisponível'))],
    ['resposta sem corpo JSON', () => Promise.resolve({ ok: true })],
  ])('mantém a escolha local em caso de %s', async (_, response) => {
    setAnalyticsConsent(CONSENT_GRANTED);
    fetchMock.mockImplementation(response);

    await expect(syncAnalyticsConsent()).resolves.toBeUndefined();

    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
  });
});

describe('refreshAnalyticsConsentVersion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('apaga a escolha local quando a versão do texto mudou', () => {
    localStorage.setItem(CONSENT_KEY, CONSENT_GRANTED);
    localStorage.setItem(CONSENT_VERSION_KEY, '0');

    refreshAnalyticsConsentVersion();

    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
    expect(localStorage.getItem(CONSENT_VERSION_KEY)).toBeNull();
  });

  it('mantém a escolha quando a versão é a vigente', () => {
    setAnalyticsConsent(CONSENT_GRANTED);

    refreshAnalyticsConsentVersion();

    expect(localStorage.getItem(CONSENT_KEY)).toBe(CONSENT_GRANTED);
  });
});
