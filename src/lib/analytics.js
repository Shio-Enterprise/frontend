import { getAccessToken } from './authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Os valores precisam ser idênticos aos de SiteEventType no backend (analytics/models.py).
export const EVENT_TYPES = {
  PAGE_VIEW: 'PAGE_VIEW',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  CHECKOUT_STARTED: 'CHECKOUT_STARTED',
  PURCHASE: 'PURCHASE',
};

export const CONSENT_KEY = 'analyticsConsent';
export const CONSENT_VERSION_KEY = 'analyticsConsentVersion';
export const ANONYMOUS_ID_KEY = 'analyticsAnonymousId';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';

// Precisa acompanhar ANALYTICS_CONSENT_VERSION do backend.
export const CURRENT_CONSENT_VERSION =
  import.meta.env.VITE_ANALYTICS_CONSENT_VERSION || '1';

const MAX_PATH_LENGTH = 255;

// Navegação no painel admin não é comportamento de cliente: fica fora das métricas.
const isAdminPath = (path) => path === '/admin' || path.startsWith('/admin/');

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Armazenamento bloqueado (modo privado, por exemplo): o rastreamento segue sem persistência.
  }
};

const removeStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Sem armazenamento disponível não há o que remover.
  }
};

export const CONSENT_CHANGE_EVENT = 'analyticsconsentchange';

export const getAnalyticsConsent = () => readStorage(CONSENT_KEY);

export const getAnalyticsConsentVersion = () => readStorage(CONSENT_VERSION_KEY);

export const isAnalyticsConsentCurrent = () => {
  const choice = getAnalyticsConsent();
  if (choice !== CONSENT_GRANTED && choice !== CONSENT_DENIED) return false;
  return getAnalyticsConsentVersion() === CURRENT_CONSENT_VERSION;
};

// Ao recusar, o identificador anônimo também é apagado: nada mais fica guardado no navegador.
// Com `null`, a escolha local é apagada e o banner volta a aparecer.
export const setAnalyticsConsent = (value, version = CURRENT_CONSENT_VERSION) => {
  if (value === null) {
    removeStorage(CONSENT_KEY);
    removeStorage(CONSENT_VERSION_KEY);
  } else {
    writeStorage(CONSENT_KEY, value);
    writeStorage(CONSENT_VERSION_KEY, version);
  }
  if (value !== CONSENT_GRANTED) removeStorage(ANONYMOUS_ID_KEY);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
};

const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

/**
 * Grava a escolha no navegador e a registra no backend.
 * A promessa sempre resolve, mesmo se o backend falhar.
 */
export const registerAnalyticsConsent = (value) => {
  // A recusa também gera identificador: sem ele o backend não registra a escolha.
  const anonymousId = getAnonymousId();
  setAnalyticsConsent(value);
  const payload = { choice: value, anonymous_id: anonymousId };
  return fetch(`${API_BASE_URL}/api/analytics/consent/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
    .then(() => {})
    .catch(() => {});
};

const applyRemoteConsent = (consent) => {
  if (consent.version !== consent.current_version) {
    setAnalyticsConsent(null);
    return;
  }
  setAnalyticsConsent(consent.choice, consent.version);
};

/**
 * Após o login, alinha a escolha local com a da conta.
 * Recusa local prevalece sobre aceite remoto. Aceite local só vira prova da
 * versão vigente se a versão guardada no navegador for a atual.
 */
export const syncAnalyticsConsent = async () => {
  if (!getAccessToken()) return;
  const anonymousId = readStorage(ANONYMOUS_ID_KEY);
  const query = anonymousId ? `?anonymous_id=${encodeURIComponent(anonymousId)}` : '';

  let consent;
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/consent/${query}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return;
    consent = await response.json();
  } catch {
    return;
  }
  if (!consent || !('choice' in consent)) return;

  const local = getAnalyticsConsent();
  const localVersion = getAnalyticsConsentVersion();
  const currentVersion = consent.current_version || CURRENT_CONSENT_VERSION;

  if (local === CONSENT_DENIED) {
    if (localVersion === currentVersion) {
      await registerAnalyticsConsent(CONSENT_DENIED);
    } else {
      setAnalyticsConsent(null);
    }
    return;
  }

  if (consent.choice !== null) {
    applyRemoteConsent(consent);
    return;
  }

  if (local === CONSENT_GRANTED && localVersion === currentVersion) {
    await registerAnalyticsConsent(CONSENT_GRANTED);
    return;
  }

  if (local !== null && localVersion !== currentVersion) {
    setAnalyticsConsent(null);
  }
};

/**
 * Visitante: se a versão local do texto do banner mudou, limpa a escolha
 * para o banner aparecer de novo.
 */
export const refreshAnalyticsConsentVersion = () => {
  const choice = getAnalyticsConsent();
  if (choice === null) return;
  if (getAnalyticsConsentVersion() !== CURRENT_CONSENT_VERSION) {
    setAnalyticsConsent(null);
  }
};

export const getAnonymousId = () => {
  let id = readStorage(ANONYMOUS_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeStorage(ANONYMOUS_ID_KEY, id);
  }
  return id;
};

// No logout o identificador é trocado: a navegação anônima seguinte, no mesmo navegador,
// não pode ser vinculada à conta de quem entrar depois.
export const resetAnonymousId = () => removeStorage(ANONYMOUS_ID_KEY);

/**
 * Após o login, vincula à conta a navegação feita antes do login neste navegador.
 * Só age com consentimento e quando há identificador anônimo e token.
 */
export const linkAnonymousEvents = () => {
  if (getAnalyticsConsent() !== CONSENT_GRANTED) return;
  const anonymousId = readStorage(ANONYMOUS_ID_KEY);
  const token = getAccessToken();
  if (!anonymousId || !token) return;

  fetch(`${API_BASE_URL}/api/analytics/link/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ anonymous_id: anonymousId }),
  }).catch(() => {});
};

/**
 * Envia um evento de navegação para o backend.
 * Não envia nada sem consentimento explícito e nunca lança erro para a interface.
 */
export const trackEvent = (eventType, { productId, variationId, path } = {}) => {
  if (getAnalyticsConsent() !== CONSENT_GRANTED) return;
  if (!isAnalyticsConsentCurrent()) return;

  const currentPath = path ?? window.location.pathname;
  if (isAdminPath(currentPath)) return;

  const payload = {
    event_type: eventType,
    anonymous_id: getAnonymousId(),
    path: currentPath.slice(0, MAX_PATH_LENGTH),
  };
  if (productId) payload.product = productId;
  if (variationId) payload.variation = variationId;

  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(`${API_BASE_URL}/api/analytics/events/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
};
