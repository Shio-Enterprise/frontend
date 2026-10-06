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
export const ANONYMOUS_ID_KEY = 'analyticsAnonymousId';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';

const MAX_PATH_LENGTH = 255;

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

export const getAnalyticsConsent = () => readStorage(CONSENT_KEY);

export const setAnalyticsConsent = (value) => writeStorage(CONSENT_KEY, value);

export const getAnonymousId = () => {
  let id = readStorage(ANONYMOUS_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeStorage(ANONYMOUS_ID_KEY, id);
  }
  return id;
};

/**
 * Envia um evento de navegação para o backend.
 * Não envia nada sem consentimento explícito e nunca lança erro para a interface.
 */
export const trackEvent = (eventType, { productId, variationId, path } = {}) => {
  if (getAnalyticsConsent() !== CONSENT_GRANTED) return;

  const payload = {
    event_type: eventType,
    anonymous_id: getAnonymousId(),
    path: (path ?? window.location.pathname).slice(0, MAX_PATH_LENGTH),
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
